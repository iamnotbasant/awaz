//! Clipboard me text + Ctrl+V se focused app me paste (Unicode-safe).
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::time::Duration;

pub fn paste_text(text: &str) -> Result<(), String> {
    let mut cb =
        arboard::Clipboard::new().map_err(|e| format!("clipboard open: {e}"))?;
    let old = cb.get_text().ok();
    cb.set_text(text)
        .map_err(|e| format!("clipboard set: {e}"))?;
    std::thread::sleep(Duration::from_millis(150));

    let mut enigo =
        Enigo::new(&Settings::default()).map_err(|e| format!("keyboard: {e:?}"))?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| format!("ctrl down: {e:?}"))?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| format!("v: {e:?}"))?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| format!("ctrl up: {e:?}"))?;

    // clipboard restore + X11 ke liye thoda hold
    std::thread::sleep(Duration::from_millis(300));
    if let Some(old) = old {
        let _ = cb.set_text(old);
    }
    std::thread::sleep(Duration::from_millis(200));
    Ok(())
}
