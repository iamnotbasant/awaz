//! OS ke saath auto-start on/off.
pub fn set(enable: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        set_windows(enable)
    }
    #[cfg(target_os = "linux")]
    {
        set_linux(enable)
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    {
        Err("is OS pe auto-start supported nahi".to_string())
    }
}

#[cfg(windows)]
fn set_windows(enable: bool) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run = hkcu
        .open_subkey_with_flags(
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            KEY_WRITE,
        )
        .map_err(|e| format!("registry: {e}"))?;
    if enable {
        let exe = std::env::current_exe().map_err(|e| format!("exe path: {e}"))?;
        run.set_value("Awaz", &exe.to_string_lossy().to_string())
            .map_err(|e| format!("registry set: {e}"))?;
    } else {
        let _ = run.delete_value("Awaz");
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn set_linux(enable: bool) -> Result<(), String> {
    let dir = dirs::config_dir()
        .ok_or_else(|| "config dir nahi mila".to_string())?
        .join("autostart");
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir: {e}"))?;
    let path = dir.join("awaz.desktop");
    if enable {
        let exe = std::env::current_exe().map_err(|e| format!("exe path: {e}"))?;
        let content = format!(
            "[Desktop Entry]\nType=Application\nName=Awaz\nExec={}\nX-GNOME-Autostart-enabled=true\n",
            exe.display()
        );
        std::fs::write(path, content).map_err(|e| format!("write: {e}"))?;
    } else {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}
