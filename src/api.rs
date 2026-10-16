//! Gemini 3.5 Transcribe: Files API upload -> poll ACTIVE -> Interactions API -> delete.
//! (Python version me live-tested flow ka Rust port.)
use reqwest::blocking::{Client, multipart};
use serde_json::Value;
use std::time::Duration;

const API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";
const UPLOAD_URL: &str = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const MODEL: &str = "gemini-3.5-transcribe";

fn client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .expect("http client")
}

fn short(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

/// Audio upload karo, (file_name, file_uri) wapas.
pub fn upload_audio(api_key: &str, wav: &[u8]) -> Result<(String, String), String> {
    let meta = serde_json::json!({"file": {"display_name": format!("awaz-{}.wav", now_secs())}}).to_string();
    let form = multipart::Form::new()
        .part(
            "metadata",
            multipart::Part::text(meta)
                .mime_str("application/json")
                .map_err(|e| format!("upload: {e}"))?,
        )
        .part(
            "file",
            multipart::Part::bytes(wav.to_vec())
                .file_name("audio.wav")
                .mime_str("audio/wav")
                .map_err(|e| format!("upload: {e}"))?,
        );
    let resp = client()
        .post(UPLOAD_URL)
        .header("x-goog-api-key", api_key)
        .multipart(form)
        .send()
        .map_err(|e| format!("upload request: {e}"))?;
    if !resp.status().is_success() {
        let st = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("upload failed ({st}): {}", short(&body, 300)));
    }
    let v: Value = resp.json().map_err(|e| format!("upload json: {e}"))?;
    let name = v["file"]["name"]
        .as_str()
        .ok_or("upload: file.name missing")?
        .to_string();
    let uri = v["file"]["uri"]
        .as_str()
        .ok_or("upload: file.uri missing")?
        .to_string();

    for _ in 0..60 {
        let r = client()
            .get(format!("{API_BASE}/{name}"))
            .header("x-goog-api-key", api_key)
            .send()
            .map_err(|e| format!("poll: {e}"))?;
        let v: Value = r.json().map_err(|e| format!("poll json: {e}"))?;
        match v["state"].as_str() {
            Some("ACTIVE") => return Ok((name, uri)),
            Some("FAILED") => return Err("audio process nahi ho paya (FAILED)".into()),
            _ => std::thread::sleep(Duration::from_secs(2)),
        }
    }
    Err("audio ready hone me bahut time lag gaya".into())
}

/// Interactions API se transcribe karo. mode: "smart" | "verbatim".
pub fn transcribe_uri(
    api_key: &str,
    file_uri: &str,
    mode: &str,
    language_codes: &[String],
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": MODEL,
        "input": [{"type": "audio", "uri": file_uri, "mime_type": "audio/wav"}],
        "generation_config": {
            "transcription_config": {
                "language_codes": language_codes,
                "mode": {"type": mode}
            }
        }
    });
    let resp = client()
        .post(format!("{API_BASE}/interactions"))
        .header("x-goog-api-key", api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("transcribe request: {e}"))?;
    if !resp.status().is_success() {
        let st = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("transcribe failed ({st}): {}", short(&body, 400)));
    }
    let v: Value = resp.json().map_err(|e| format!("transcribe json: {e}"))?;
    let mut texts = Vec::new();
    if let Some(steps) = v["steps"].as_array() {
        for s in steps {
            if let Some(contents) = s["content"].as_array() {
                for c in contents {
                    if c["type"].as_str() == Some("text") {
                        if let Some(t) = c["text"].as_str() {
                            texts.push(t);
                        }
                    }
                }
            }
        }
    }
    Ok(texts.join("\n").trim().to_string())
}

pub fn delete_file(api_key: &str, file_name: &str) {
    let _ = client()
        .delete(format!("{API_BASE}/{file_name}"))
        .header("x-goog-api-key", api_key)
        .send();
}

/// Full pipeline: upload -> transcribe -> delete.
pub fn transcribe_audio(
    api_key: &str,
    wav: &[u8],
    mode: &str,
    language_codes: &[String],
) -> Result<String, String> {
    if wav.len() > 20 * 1024 * 1024 {
        return Err("recording bahut lambi hai (20MB+)".into());
    }
    let (name, uri) = upload_audio(api_key, wav)?;
    let r = transcribe_uri(api_key, &uri, mode, language_codes);
    delete_file(api_key, &name);
    let text = r?;
    if text.is_empty() {
        return Err("kuch samajh nahi aaya — dobara try karo".into());
    }
    Ok(text)
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// LIVE test: asli API pe. `GEMINI_API_KEY` env chahiye.
    #[test]
    fn live_transcribe_smoke() {
        let key = std::env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY env needed");
        let wav = std::fs::read("/tmp/rambler-test/speech.wav").expect("speech.wav missing");
        let text =
            transcribe_audio(&key, &wav, "smart", &["en-US".to_string()]).expect("transcribe failed");
        println!("TRANSCRIPT: {text}");
        assert!(
            text.to_lowercase().contains("rambler"),
            "unexpected transcript: {text}"
        );
    }
}
