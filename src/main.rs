//! Awaz 1.0.0 — system-wide voice dictation (Windows + Linux).
//! Ctrl+Shift+F / Numpad Enter -> mic -> Gemini 3.5 Transcribe -> focused app me paste.
#![windows_subsystem = "windows"] // Windows pe console window na dikhe

mod api;
mod audio;
mod autostart;
mod config;
mod hotkey;
mod paste;
mod tray;

use std::collections::VecDeque;
use std::sync::mpsc;
use std::time::{Duration, Instant};

// ---------- colors ----------
fn bg() -> egui::Color32 {
    egui::Color32::from_rgba_unmultiplied(0x20, 0x21, 0x24, 238)
}
const WHITE: egui::Color32 = egui::Color32::WHITE;
const DIM: egui::Color32 = egui::Color32::from_rgb(0x9a, 0xa0, 0xa6);
const RED: egui::Color32 = egui::Color32::from_rgb(0xea, 0x43, 0x35);
const YELLOW: egui::Color32 = egui::Color32::from_rgb(0xfb, 0xbc, 0x04);
const GREEN: egui::Color32 = egui::Color32::from_rgb(0x34, 0xa8, 0x53);

// ---------- logging ----------
fn log(msg: &str) {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{secs}] {msg}");
    eprintln!("{line}");
    let dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("awaz");
    let _ = std::fs::create_dir_all(&dir);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("awaz.log"))
    {
        let _ = writeln!(f, "{line}");
    }
}

// ---------- state ----------
#[derive(PartialEq, Clone, Copy)]
enum Phase {
    Setup,
    Idle,
    Listening,
    Working,
    Done,
    Error,
    Info,
}

enum WorkerMsg {
    Done(String),
    Error(String),
}

struct AwazApp {
    cfg: config::Config,
    phase: Phase,
    phase_at: Instant,
    rec_start: Instant,
    status: String,
    sub: String,
    hotkeys: Option<hotkey::Hotkeys>,
    recorder: Option<audio::Recorder>,
    levels: VecDeque<f32>,
    worker_tx: mpsc::Sender<WorkerMsg>,
    worker_rx: mpsc::Receiver<WorkerMsg>,
    app_rx: mpsc::Receiver<tray::AppEvent>,
    api_key_input: String,
}

impl AwazApp {
    fn new(cc: &eframe::CreationContext) -> Self {
        let cfg = config::load();
        let (worker_tx, worker_rx) = mpsc::channel();
        let (app_tx, app_rx) = mpsc::channel();
        tray::spawn_tray(app_tx);

        let hotkeys = match hotkey::Hotkeys::new() {
            Ok(h) => Some(h),
            Err(e) => {
                log(&format!("hotkey fail: {e}"));
                None
            }
        };

        let (phase, status, sub) = if cfg.api_key.is_empty() {
            cc.egui_ctx
                .send_viewport_cmd(egui::ViewportCommand::Visible(true));
            (
                Phase::Setup,
                "Awaz setup".to_string(),
                "API key chahiye".to_string(),
            )
        } else {
            cc.egui_ctx
                .send_viewport_cmd(egui::ViewportCommand::Visible(true));
            (
                Phase::Info,
                "Awaz ready hai!".to_string(),
                "Ctrl+Shift+F ya Numpad Enter dabao".to_string(),
            )
        };
        log("Awaz 1.0.0 started");

        Self {
            cfg,
            phase,
            phase_at: Instant::now(),
            rec_start: Instant::now(),
            status,
            sub,
            hotkeys,
            recorder: None,
            levels: VecDeque::with_capacity(24),
            worker_tx,
            worker_rx,
            app_rx,
            api_key_input: String::new(),
        }
    }

    // ---------- helpers ----------
    fn show(&self, ctx: &egui::Context) {
        ctx.send_viewport_cmd(egui::ViewportCommand::Visible(true));
    }
    fn hide(&self, ctx: &egui::Context) {
        ctx.send_viewport_cmd(egui::ViewportCommand::Visible(false));
    }
    fn set_phase(&mut self, phase: Phase, status: &str, sub: &str) {
        self.phase = phase;
        self.phase_at = Instant::now();
        self.status = status.to_string();
        self.sub = sub.to_string();
    }

    // ---------- recording ----------
    fn toggle(&mut self, ctx: &egui::Context) {
        match self.phase {
            Phase::Idle => self.start_listening(ctx),
            Phase::Listening => self.stop_listening(ctx),
            Phase::Done | Phase::Error | Phase::Info => {
                self.hide(ctx);
                self.phase = Phase::Idle;
            }
            _ => {}
        }
    }

    fn start_listening(&mut self, ctx: &egui::Context) {
        match audio::Recorder::start() {
            Ok(rec) => {
                self.recorder = Some(rec);
                self.levels.clear();
                self.rec_start = Instant::now();
                self.set_phase(Phase::Listening, "Sun raha hun...", "bolo, mai likh raha hun");
                self.show(ctx);
                log("listening started");
            }
            Err(e) => {
                log(&format!("mic fail: {e}"));
                self.set_phase(Phase::Error, "Mic nahi mila", &e);
                self.show(ctx);
            }
        }
    }

    fn stop_listening(&mut self, ctx: &egui::Context) {
        let rec = match self.recorder.take() {
            Some(r) => r,
            None => return,
        };
        let samples = rec.stop();
        if samples.is_empty() {
            self.hide(ctx);
            self.phase = Phase::Idle;
            return;
        }
        self.set_phase(Phase::Working, "Samajh raha hun...", "Gemini sun raha hai");
        let wav = audio::to_wav(&samples);
        let cfg = self.cfg.clone();
        let tx = self.worker_tx.clone();
        let egui_ctx = ctx.clone();
        std::thread::spawn(move || {
            let result = api::transcribe_audio(&cfg.api_key, &wav, &cfg.mode, &cfg.language_codes);
            match result {
                Ok(text) => {
                    if let Err(e) = paste::paste_text(&text) {
                        log(&format!("paste fail: {e}"));
                    }
                    let _ = tx.send(WorkerMsg::Done(text));
                }
                Err(e) => {
                    log(&format!("transcribe fail: {e}"));
                    let _ = tx.send(WorkerMsg::Error(e));
                }
            }
            egui_ctx.request_repaint();
        });
        log("transcribe worker started");
    }

    fn cancel_listening(&mut self, ctx: &egui::Context) {
        drop(self.recorder.take());
        self.levels.clear();
        self.hide(ctx);
        self.phase = Phase::Idle;
        log("listening cancelled");
    }

    // ---------- per-frame ----------
    fn frame(&mut self, ui: &mut egui::Ui) {
        let ctx = ui.ctx().clone();

        // tray events
        while let Ok(ev) = self.app_rx.try_recv() {
            match ev {
                tray::AppEvent::Quit => {
                    log("quit from tray");
                    ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                }
                tray::AppEvent::ToggleMode => {
                    self.cfg.mode = if self.cfg.mode == "smart" {
                        "verbatim".to_string()
                    } else {
                        "smart".to_string()
                    };
                    config::save(&self.cfg);
                    log(&format!("mode -> {}", self.cfg.mode));
                }
                tray::AppEvent::ToggleAutostart => {
                    self.cfg.autostart = !self.cfg.autostart;
                    match autostart::set(self.cfg.autostart) {
                        Ok(()) => log(&format!("autostart -> {}", self.cfg.autostart)),
                        Err(e) => log(&format!("autostart fail: {e}")),
                    }
                    config::save(&self.cfg);
                }
            }
        }

        // hotkeys (pehle ids nikalo, borrow khatam, phir toggle)
        let hotkey_hit = if let Some(hk) = &self.hotkeys {
            let ids = hk.poll();
            ids.iter()
                .any(|id| *id == hk.toggle_id || *id == hk.numpad_id)
        } else {
            false
        };
        if hotkey_hit {
            self.toggle(&ctx);
        }

        // worker results
        while let Ok(msg) = self.worker_rx.try_recv() {
            match msg {
                WorkerMsg::Done(text) => {
                    let preview: String = text.chars().take(90).collect();
                    self.set_phase(
                        Phase::Done,
                        "Ho gaya!",
                        &format!("\"{preview}\""),
                    );
                    self.show(&ctx);
                }
                WorkerMsg::Error(e) => {
                    self.set_phase(Phase::Error, "Kuch gadbad hui", &e);
                    self.show(&ctx);
                }
            }
        }

        // auto-hide timers
        match self.phase {
            Phase::Done if self.phase_at.elapsed() > Duration::from_millis(1800) => {
                self.hide(&ctx);
                self.phase = Phase::Idle;
            }
            Phase::Error if self.phase_at.elapsed() > Duration::from_secs(4) => {
                self.hide(&ctx);
                self.phase = Phase::Idle;
            }
            Phase::Info if self.phase_at.elapsed() > Duration::from_millis(3500) => {
                self.hide(&ctx);
                self.phase = Phase::Idle;
            }
            _ => {}
        }

        // waveform data + repaint scheduling
        if self.phase == Phase::Listening {
            if let Some(rec) = &self.recorder {
                self.levels.push_back(rec.level());
                while self.levels.len() > 24 {
                    self.levels.pop_front();
                }
            }
            ctx.request_repaint_after(Duration::from_millis(33));
        } else if self.phase == Phase::Working {
            ctx.request_repaint_after(Duration::from_millis(60));
        }

        // render
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(egui::Color32::TRANSPARENT))
            .show(ui, |ui| {
                let rect = ui.max_rect();
                ui.painter()
                    .rect_filled(rect, egui::CornerRadius::same(18), bg());
                if self.phase == Phase::Setup {
                    self.render_setup(ui, &ctx);
                } else {
                    self.render_popup(ui, &ctx);
                }
            });
    }

    fn render_setup(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.vertical_centered(|ui| {
            ui.add_space(8.0);
            ui.label(
                egui::RichText::new("Awaz")
                    .size(22.0)
                    .strong()
                    .color(WHITE),
            );
            ui.label(
                egui::RichText::new("Apni free Gemini API key daalo (ek baar):")
                    .size(12.0)
                    .color(DIM),
            );
            ui.label(
                egui::RichText::new("aistudio.google.com/apikey se free me banao")
                    .size(11.0)
                    .color(DIM),
            );
            ui.add_space(6.0);
            let resp = ui.add(
                egui::TextEdit::singleline(&mut self.api_key_input)
                    .password(true)
                    .desired_width(320.0)
                    .hint_text("API key yahan paste karo"),
            );
            let enter = resp.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
            ui.add_space(6.0);
            if ui
                .add(
                    egui::Button::new(
                        egui::RichText::new("Save aur shuru karo").strong().color(WHITE),
                    )
                    .fill(GREEN),
                )
                .clicked()
                || enter
            {
                let k = self.api_key_input.trim().to_string();
                if !k.is_empty() {
                    self.cfg.api_key = k;
                    config::save(&self.cfg);
                    log("api key saved");
                    self.set_phase(
                        Phase::Info,
                        "Awaz ready hai!",
                        "Ctrl+Shift+F ya Numpad Enter dabao",
                    );
                }
            }
            ui.add_space(4.0);
            ui.label(
                egui::RichText::new("Purane version ki key mili to auto uthai jayegi")
                    .size(10.0)
                    .color(DIM),
            );
        });
        let _ = ctx;
    }

    fn render_popup(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.horizontal(|ui| {
            ui.label(
                egui::RichText::new(&self.status)
                    .size(15.0)
                    .strong()
                    .color(WHITE),
            );
            ui.with_layout(egui::Layout::right_to_left(egui::Align::TOP), |ui| {
                if ui
                    .button(egui::RichText::new("X").strong().color(DIM))
                    .clicked()
                {
                    if self.phase == Phase::Listening {
                        self.cancel_listening(ctx);
                    } else {
                        self.hide(ctx);
                        self.phase = Phase::Idle;
                    }
                }
            });
        });

        ui.horizontal(|ui| {
            let (wrect, _) =
                ui.allocate_exact_size(egui::vec2(110.0, 70.0), egui::Sense::hover());
            self.paint_waveform(ui.painter_at(wrect), wrect);
            ui.vertical(|ui| {
                ui.label(egui::RichText::new(&self.sub).size(11.0).color(DIM));
                if self.phase == Phase::Listening {
                    let secs = self.rec_start.elapsed().as_secs();
                    ui.label(
                        egui::RichText::new(format!("{secs}s"))
                            .size(11.0)
                            .color(DIM),
                    );
                    ui.add_space(4.0);
                    if ui
                        .add(
                            egui::Button::new(
                                egui::RichText::new("STOP").strong().color(WHITE),
                            )
                            .fill(RED),
                        )
                        .clicked()
                    {
                        self.stop_listening(ctx);
                    }
                }
            });
        });

        ui.label(
            egui::RichText::new("Hotkey dobara dabao = stop   |   X = band karo")
                .size(9.0)
                .color(DIM),
        );
    }

    fn paint_waveform(&self, painter: egui::Painter, rect: egui::Rect) {
        let n = 22;
        let gap = 2.0;
        let bw = (rect.width() - gap * (n as f32 - 1.0)) / n as f32;
        let color = match self.phase {
            Phase::Listening => RED,
            Phase::Working => YELLOW,
            Phase::Done => GREEN,
            Phase::Error => RED,
            _ => DIM,
        };
        let t = self.phase_at.elapsed().as_secs_f32();
        for i in 0..n {
            let v = match self.phase {
                Phase::Listening => *self.levels.iter().nth(i).unwrap_or(&0.0),
                Phase::Working => 0.35 + 0.3 * (t * 6.0 + i as f32 * 0.55).sin().abs(),
                Phase::Done | Phase::Error => 0.15,
                _ => 0.05,
            };
            let h = (v.clamp(0.02, 1.0) * rect.height()).max(3.0);
            let x = rect.min.x + i as f32 * (bw + gap);
            let bar = egui::Rect::from_min_size(
                egui::pos2(x, rect.center().y - h / 2.0),
                egui::vec2(bw, h),
            );
            painter.rect_filled(bar, egui::CornerRadius::same(2), color);
        }
        // Done pe check mark
        if self.phase == Phase::Done {
            let c = rect.center() + egui::vec2(0.0, 0.0);
            painter.line_segment(
                [c + egui::vec2(-14.0, 0.0), c + egui::vec2(-4.0, 10.0)],
                egui::Stroke::new(5.0, GREEN),
            );
            painter.line_segment(
                [c + egui::vec2(-4.0, 10.0), c + egui::vec2(16.0, -12.0)],
                egui::Stroke::new(5.0, GREEN),
            );
        }
    }
}

impl eframe::App for AwazApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.frame(ui);
    }

    fn clear_color(&self, _visuals: &egui::Visuals) -> [f32; 4] {
        [0.0, 0.0, 0.0, 0.0]
    }
}

fn main() {
    let opts = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_decorations(false)
            .with_always_on_top()
            .with_transparent(true)
            .with_inner_size([470.0, 150.0])
            .with_resizable(false)
            .with_taskbar(false)
            .with_visible(false),
        ..Default::default()
    };
    if let Err(e) = eframe::run_native(
        "Awaz",
        opts,
        Box::new(|cc| Ok(Box::new(AwazApp::new(cc)) as Box<dyn eframe::App>)),
    ) {
        log(&format!("run_native fail: {e}"));
    }
}
