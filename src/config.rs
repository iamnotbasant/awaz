//! Config load/save + purane Python version se migration.
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub api_key: String,
    pub mode: String, // "smart" | "verbatim"
    pub language_codes: Vec<String>,
    pub autostart: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            mode: "smart".to_string(),
            language_codes: vec!["hi-IN".to_string(), "en-IN".to_string()],
            autostart: false,
        }
    }
}

pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("awaz").join("config.json")
}

pub fn load() -> Config {
    let mut cfg = Config::default();
    let path = config_path();
    if let Ok(data) = fs::read_to_string(&path) {
        if let Ok(saved) = serde_json::from_str::<Config>(&data) {
            cfg = saved;
        }
    }
    if cfg.api_key.is_empty() {
        // purane Python version (rambler-windows-v*) ke folder se key utha lao
        if let Some(old) = find_old_python_config() {
            cfg.api_key = old.api_key;
            if !old.mode.is_empty() {
                cfg.mode = old.mode;
            }
            if !old.language_codes.is_empty() {
                cfg.language_codes = old.language_codes;
            }
            cfg.autostart = old.autostart;
            save(&cfg);
        }
    }
    cfg
}

pub fn save(cfg: &Config) {
    let path = config_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(data) = serde_json::to_string_pretty(cfg) {
        let _ = fs::write(path, data);
    }
}

#[derive(Debug, Deserialize)]
struct OldPyConfig {
    #[serde(default)]
    api_key: String,
    #[serde(default)]
    mode: String,
    #[serde(default)]
    language_codes: Vec<String>,
    #[serde(default)]
    autostart: bool,
}

/// Purane `rambler-windows-v*` folders me newest config.json dhoondo.
fn find_old_python_config() -> Option<OldPyConfig> {
    let home = dirs::home_dir()?;
    // likely jagah: home, Downloads, Desktop, Documents (2 level tak)
    let mut roots = vec![home.clone()];
    for d in ["Downloads", "Desktop", "Documents"] {
        let p = home.join(d);
        if p.is_dir() {
            roots.push(p);
        }
    }
    let mut best: Option<(std::time::SystemTime, OldPyConfig)> = None;
    for root in roots {
        let entries = fs::read_dir(&root).ok()?;
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.starts_with("rambler-windows") {
                continue;
            }
            let cfg_path = e.path().join("config.json");
            let meta = fs::metadata(&cfg_path).ok()?;
            let mtime = meta.modified().ok()?;
            let data = fs::read_to_string(&cfg_path).ok()?;
            if let Ok(old) = serde_json::from_str::<OldPyConfig>(&data) {
                if !old.api_key.is_empty()
                    && best.as_ref().map(|(t, _)| *t < mtime).unwrap_or(true)
                {
                    best = Some((mtime, old));
                }
            }
        }
    }
    best.map(|(_, cfg)| cfg)
}
