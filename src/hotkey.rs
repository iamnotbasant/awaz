//! Global hotkeys: Ctrl+D + Numpad Enter.
use global_hotkey::{
    GlobalHotKeyEvent,
    HotKeyState,
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyManager,
};

pub struct Hotkeys {
    _manager: GlobalHotKeyManager, // zinda rakhna zaroori hai
    pub toggle_id: u32,
    pub numpad_id: u32,
}

impl Hotkeys {
    pub fn new() -> Result<Self, String> {
        let manager = GlobalHotKeyManager::new().map_err(|e| {
            let err = format!("hotkey manager: {e}");
            crate::log(&err);
            err
        })?;
        let toggle = HotKey::new(Some(Modifiers::CONTROL), Code::KeyD);
        let numpad = HotKey::new(None, Code::NumpadEnter);
        manager.register(toggle).map_err(|e| {
            let err = format!("hotkey register (ctrl+d): {e}");
            crate::log(&err);
            err
        })?;
        crate::log("hotkey registered: ctrl+d");
        manager.register(numpad).map_err(|e| {
            let err = format!("hotkey register (numpad enter): {e}");
            crate::log(&err);
            err
        })?;
        crate::log("hotkey registered: numpad-enter");
        Ok(Self {
            toggle_id: toggle.id(),
            numpad_id: numpad.id(),
            _manager: manager,
        })
    }

    /// Hotkey events wapas: (id, is_pressed).
    pub fn poll(&self) -> Vec<(u32, bool)> {
        let mut events = Vec::new();
        while let Ok(ev) = GlobalHotKeyEvent::receiver().try_recv() {
            events.push((ev.id, ev.state == HotKeyState::Pressed));
        }
        events
    }
}
