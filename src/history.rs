//! Dictation history (local, searchable).
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Serialize, Deserialize)]
pub struct Entry {
    pub ts: u64,
    pub text: String,
}

fn path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("awaz").join("history.json")
}

pub fn load() -> Vec<Entry> {
    let p = path();
    if let Ok(data) = std::fs::read_to_string(p) {
        if let Ok(entries) = serde_json::from_str::<Vec<Entry>>(&data) {
            return entries;
        }
    }
    Vec::new()
}

pub fn push(text: &str) {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return;
    }
    let mut entries = load();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    entries.insert(
        0,
        Entry {
            ts: now,
            text: trimmed.to_string(),
        },
    );
    entries.truncate(50);
    let p = path();
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(data) = serde_json::to_string_pretty(&entries) {
        let _ = std::fs::write(p, data);
    }
    crate::log("history: saved");
}

pub fn search<'a>(entries: &'a [Entry], q: &str) -> Vec<&'a Entry> {
    let q = q.trim();
    if q.is_empty() {
        entries.iter().collect()
    } else {
        let q_lower = q.to_lowercase();
        entries
            .iter()
            .filter(|e| e.text.to_lowercase().contains(&q_lower))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search() {
        let entries = vec![
            Entry {
                ts: 100,
                text: "Namaste dosto".into(),
            },
            Entry {
                ts: 200,
                text: "Hello world".into(),
            },
        ];
        assert_eq!(search(&entries, "").len(), 2);
        assert_eq!(search(&entries, "namaste").len(), 1);
        assert_eq!(search(&entries, "DOSTO").len(), 1);
        assert_eq!(search(&entries, "xyz").len(), 0);
    }
}
