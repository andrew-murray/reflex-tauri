// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{AppHandle, Emitter};
use std::env;
use std::fs;
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;

fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where P: AsRef<Path>, {
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

#[tauri::command]
fn download(app: AppHandle, url: String) {
  app.emit("download-started", &url).unwrap();
  for progress in [1, 15, 50, 80, 100] {
    app.emit("download-progress", progress).unwrap();
  }
  app.emit("download-finished", &url).unwrap();
}

#[tauri::command]
fn find_configuration()  {
    let app_data_result = env::var("APPDATA");
    if !app_data_result.is_ok() {
        println!("{}", "unimp 1");
        unimplemented!();
    }

    let app_data_dir = app_data_result.unwrap();
    let preferences_relpath = "Adobe/Lightroom/Preferences/Lightroom Classic CC 7 Preferences.agprefs";  
    let expected_adobe_prefs = app_data_dir + "/" + preferences_relpath;
    let path_exists_result = fs::exists(&expected_adobe_prefs);
    if !path_exists_result.is_ok() {
        println!("{}", "unimp 2");
        unimplemented!();
    }
    if path_exists_result.is_ok() && !path_exists_result.unwrap() {
        println!("{}", "unimp 3");
        unimplemented!();
    }

    println!("{}", "reading from ".to_owned() + &expected_adobe_prefs);
    if let Ok(lines) = read_lines(&expected_adobe_prefs) {
        // Consumes the iterator, returns an (Optional) String
        // FIXME: Should really parse this properly
        for line in lines.map_while(Result::ok) {
            // println!("{}", line);
            if line.contains("libraryToLoad20") {
                let parts = line.split("=");
                let parts_collected = parts.collect::<Vec<&str>>();
                // if the path contains an equals let's rebuild it
                // TODO: Stripping the path of quotes should be redundant/confusing
                let library_path : String = parts_collected[1..]
                    .join("=")
                    .trim()
                    .trim_end_matches(",")
                    .trim_matches('"')
                    .to_owned();
                // note that as 
                println!("library_path = {}", library_path);
            }
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            let _ = find_configuration();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
