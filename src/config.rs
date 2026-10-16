//! Config load/save + purane Python version se migration.
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub api_key: String,
    pub mode: String, // "smart" | "verbatim"
    pub language_codes: Vec<String>,
    pub autostart: bool,
    #[serde(default)]
    pub hold_to_talk: bool,
    #[serde(default)]
    pub dictionary: Vec<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            mode: "smart".to_string(),
            language_codes: vec!["hi-IN".to_string(), "en-IN".to_string()],
            autostart: false,
            hold_to_talk: false,
            dictionary: Vec::new(),
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
        if let Some((old_dir, old)) = find_old_python_config() {
            crate::log(&format!("migration: found old key: {}", old_dir.display()));
            cfg.api_key = old.api_key;
            if !old.mode.is_empty() {
                cfg.mode = old.mode;
            }
            if !old.language_codes.is_empty() {
                cfg.language_codes = old.language_codes;
            }
            cfg.autostart = old.autostart;
            save(&cfg);
        } else {
            crate::log("migration: no old key found");
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

/// Purane `rambler-windows-v*` folders me newest config.json dhoondo (3 levels deep).
fn find_old_python_config() -> Option<(PathBuf, OldPyConfig)> {
    let home = dirs::home_dir()?;
    let mut roots = vec![home.clone()];
    for d in ["Downloads", "Desktop", "Documents"] {
        let p = home.join(d);
        if p.is_dir() {
            roots.push(p);
        }
    }
    let mut best: Option<(std::time::SystemTime, PathBuf, OldPyConfig)> = None;

    fn scan(
        dir: &Path,
        depth: usize,
        best: &mut Option<(std::time::SystemTime, PathBuf, OldPyConfig)>,
    ) {
        if depth > 3 {
            return;
        }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if name.starts_with("rambler-windows") {
                let cfg_path = path.join("config.json");
                if let Ok(meta) = fs::metadata(&cfg_path) {
                    if let Ok(mtime) = meta.modified() {
                        if let Ok(data) = fs::read_to_string(&cfg_path) {
                            if let Ok(old) = serde_json::from_str::<OldPyConfig>(&data) {
                                if !old.api_key.trim().is_empty() {
                                    let newer = match best {
                                        Some((t, _, _)) => *t < mtime,
                                        None => true,
                                    };
                                    if newer {
                                        *best = Some((mtime, path.clone(), old));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if depth < 3 {
                scan(&path, depth + 1, best);
            }
        }
    }

    for root in roots {
        scan(&root, 1, &mut best);
    }

    best.map(|(_, path, cfg)| (path, cfg))
}
