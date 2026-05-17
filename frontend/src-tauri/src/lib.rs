use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

// State untuk menyimpan referensi ke backend process
pub struct BackendProcess(pub Mutex<Option<Child>>);

fn start_backend(resource_dir: &std::path::Path) -> Result<Child, String> {
    let backend_exe = resource_dir.join("backend.exe");

    if !backend_exe.exists() {
        // Saat development (tauri dev), backend tidak dibundel — skip
        println!("[Tauri] backend.exe tidak ditemukan di {:?} — mode dev, skip", backend_exe);
        return Err("dev_mode".to_string());
    }

    println!("[Tauri] Menjalankan backend: {:?}", backend_exe);

    Command::new(&backend_exe)
        .spawn()
        .map_err(|e| format!("Gagal menjalankan backend.exe: {}", e))
}

fn wait_for_backend(max_attempts: u32) -> bool {
    println!("[Tauri] Menunggu backend siap...");
    for i in 0..max_attempts {
        std::thread::sleep(std::time::Duration::from_millis(500));
        // Cek apakah port 8000 sudah merespons
        if let Ok(stream) = std::net::TcpStream::connect("127.0.0.1:8000") {
            drop(stream);
            println!("[Tauri] Backend siap setelah {}ms", (i + 1) * 500);
            return true;
        }
    }
    println!("[Tauri] WARNING: Backend belum merespons setelah {}ms", max_attempts * 500);
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // Setup logger di debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Dapatkan path resource directory (tempat backend.exe dibundel)
            let resource_dir = app.path().resource_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));

            // Start backend.exe (hanya di production build)
            match start_backend(&resource_dir) {
                Ok(child) => {
                    println!("[Tauri] Backend berjalan — PID: {}", child.id());
                    let state: State<BackendProcess> = app.state();
                    *state.0.lock().unwrap() = Some(child);
                    // Tunggu backend siap (maks 15 detik = 30 percobaan x 500ms)
                    wait_for_backend(30);
                }
                Err(e) if e == "dev_mode" => {
                    println!("[Tauri] Mode development — pastikan backend sudah berjalan manual di port 8000");
                }
                Err(e) => {
                    eprintln!("[Tauri] ERROR memulai backend: {}", e);
                    // Tampilkan dialog error
                    tauri::WebviewWindowBuilder::new(
                        app,
                        "error-window",
                        tauri::WebviewUrl::App("index.html".into()),
                    )
                    .title("Error")
                    .build()?;
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Matikan backend saat window utama ditutup
            if let tauri::WindowEvent::Destroyed = event {
                let state: State<BackendProcess> = window.state();
                // Ambil child dulu ke variabel terpisah agar MutexGuard di-drop sebelum state
                let child_opt = state.0.lock().unwrap().take();
                if let Some(mut child) = child_opt {
                    println!("[Tauri] Mematikan backend process...");
                    let _ = child.kill();
                    println!("[Tauri] Backend dihentikan.");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
