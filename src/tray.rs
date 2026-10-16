//! System tray icon + menu (apne thread me chalta hai).
use std::sync::mpsc::Sender;
use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem},
    Icon, TrayIconBuilder,
};

#[derive(Debug)]
pub enum AppEvent {
    Quit,
    ToggleMode,
    ToggleAutostart,
    ToggleHold,
    ShowHistory,
}

pub fn spawn_tray(app_tx: Sender<AppEvent>) {
    std::thread::spawn(move || {
        let menu = Menu::new();
        let mode_item = MenuItem::new("Mode badlo (Smart / Verbatim)", true, None);
        let auto_item = MenuItem::new("Auto-start on/off", true, None);
        let hold_item = MenuItem::new("Hold-to-talk on/off", true, None);
        let history_item = MenuItem::new("History dekho", true, None);
        let quit_item = MenuItem::new("Band karo", true, None);
        if let Err(e) = menu.append_items(&[&mode_item, &auto_item, &hold_item, &history_item, &quit_item]) {
            eprintln!("tray menu: {e}");
            crate::log(&format!("tray menu: {e}"));
            return;
        }
        let icon = make_icon();
        let _tray = match TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip("Awaz")
            .with_icon(icon)
            .build()
        {
            Ok(t) => {
                crate::log("tray: ready");
                t
            }
            Err(e) => {
                eprintln!("tray build: {e}");
                crate::log(&format!("tray build: {e}"));
                return;
            }
        };
        let rx = MenuEvent::receiver();
        loop {
            while let Ok(ev) = rx.try_recv() {
                if ev.id == *quit_item.id() {
                    let _ = app_tx.send(AppEvent::Quit);
                } else if ev.id == *mode_item.id() {
                    let _ = app_tx.send(AppEvent::ToggleMode);
                } else if ev.id == *auto_item.id() {
                    let _ = app_tx.send(AppEvent::ToggleAutostart);
                } else if ev.id == *hold_item.id() {
                    let _ = app_tx.send(AppEvent::ToggleHold);
                } else if ev.id == *history_item.id() {
                    let _ = app_tx.send(AppEvent::ShowHistory);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(120));
        }
    });
}

/// 32x32 icon: hari circle + safed mic, code me bana hua (koi asset file nahi).
fn make_icon() -> Icon {
    let mut rgba = vec![0u8; 32 * 32 * 4];
    let (cx, cy, r) = (16.0f32, 16.0, 14.0);
    for y in 0..32 {
        for x in 0..32 {
            let dx = x as f32 + 0.5 - cx;
            let dy = y as f32 + 0.5 - cy;
            if dx * dx + dy * dy <= r * r {
                let i = (y * 32 + x) as usize * 4;
                // mic shape
                let mic = (13..=18).contains(&x) && (8..=18).contains(&y)
                    || (11..=20).contains(&x) && (15..=20).contains(&y) && !(13..=18).contains(&x)
                    || x == 16 && (21..=24).contains(&y);
                if mic {
                    rgba[i] = 255;
                    rgba[i + 1] = 255;
                    rgba[i + 2] = 255;
                } else {
                    rgba[i] = 52;
                    rgba[i + 1] = 168;
                    rgba[i + 2] = 83;
                }
                rgba[i + 3] = 255;
            }
        }
    }
    Icon::from_rgba(rgba, 32, 32).expect("tray icon")
}
