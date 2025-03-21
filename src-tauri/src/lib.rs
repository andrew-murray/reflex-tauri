// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{AppHandle, Emitter};
use tauri_plugin_fs::FsExt;
use std::env;
use std::fs;
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;
use glob::glob;
use sysinfo::{
    Disks
};
use sqlx::ConnectOptions;
use sqlx::sqlite::{SqliteConnectOptions};
use std::collections::HashMap;
use futures::executor::block_on;
use tauri::Manager;
mod lrprev;

struct AppState {
    image_id_to_image: HashMap<u64, PreviewData>
}

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

fn get_library_path_from_config_file(adobe_config_path: &str) -> Result<String, ()>
{
   let path_exists_result = fs::exists(&adobe_config_path);
    if !path_exists_result.is_ok() {
        println!("{}", "unimp 2");
        unimplemented!();
    }
    if path_exists_result.is_ok() && !path_exists_result.unwrap() {
        println!("{}", "unimp 3");
        unimplemented!();
    }

    println!("{}", "reading from ".to_owned() + &adobe_config_path);
    if let Ok(lines) = read_lines(&adobe_config_path) {
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
                return Ok(library_path);
            }
        }
    }
    unimplemented!()
}

struct PreviewData {
    image_id: u64,
    uuid: String,
    digest: String,
    orientation: Option<String>,
}

fn get_image_id_mapping()
{
    let preview_db_path = get_preview_db_path();
    if !preview_db_path.is_some()
    {
        unimplemented!()
    }
    // let connect_uri = "sqlite://".to_owned() + &preview_db_path.unwrap();
    // let connection = SqliteConnectOptions::from_str(connect_uri)?
    //    .read_only(true)
    //    .connect();
    // todo; finish this line of thought to populate the db this might all have to happen on setup
}

async fn do_sql(preview_db_path: &str) -> HashMap<u64, PreviewData>
{
    let connection = SqliteConnectOptions::new()
        .read_only(true)
        .filename(preview_db_path);
    let mut db = connection.connect().await.unwrap();
    let qresult = sqlx::query!("select imageId, uuid, digest, orientation from ImageCacheEntry")
        .fetch_all(&mut db)
        .await;
    let mut image_id_to_image = HashMap::new();
    if qresult.is_ok()
    {
        let qr = qresult.unwrap();
        for image in qr {
            image_id_to_image.insert(image.imageId as u64,PreviewData{ 
                image_id: image.imageId as u64, 
                digest: image.digest, 
                uuid: image.uuid,
                orientation: image.orientation
            });
        }
        //let imageIdToImage = qr.into_iter().map(|image| (image.imageId as u64, image)).collect::<HashMap<_, _>>();
        // let uuidToImage = imageIdToImage.iter().map(|(imp)|(imp.1.uuid.clone(), imp.1)).collect::<HashMap<_,_>>();
        // for (imageId, image) in imageIdToImage.iter()
        // {
        //     
        //     let disp = format!("uuid = {}, orientation = {}, digest = {}",
        //        image.uuid,
        //        image.orientation.clone().unwrap_or("".to_owned()),
        //        image.digest
        //     );
        //     println!("imageId {} and image {}", imageId, disp);
        // }
        // println!("lenq {}", imageIdToImage.len());
    }
    else {
        println!("{}", "all is not wel");
    }   
    return image_id_to_image;
}

fn get_preview_db_path() -> Option<String> {
    let app_data_result = env::var("APPDATA");
    if !app_data_result.is_ok() {
        println!("{}", "unimp 1");
        unimplemented!();
    }

    let app_data_dir = app_data_result.unwrap();
    let preferences_relpath = "Adobe/Lightroom/Preferences/Lightroom Classic CC 7 Preferences.agprefs";  
    let expected_adobe_prefs = app_data_dir + "/" + preferences_relpath;
    let cat_path = get_library_path_from_config_file(&expected_adobe_prefs);
    if !cat_path.is_ok() {
        println!("library_path was not defined");
        return None
    }
    let cat_path_value = cat_path.unwrap();
    println!("library_path = {}", cat_path_value);
    let cat_parent = Path::new(&cat_path_value).parent();
    if cat_parent.is_none()
    {
        return None;
    }
    let cat_directory = cat_parent.unwrap();
    let preview_glob = glob(cat_directory.join("*Previews*/previews.db").to_str().unwrap());
    if !preview_glob.is_ok() {
        return None
    }

    let preview_paths = preview_glob.unwrap();
    for entry in preview_paths {
        if let Ok(candidate_preview_path) = entry {
            println!("candidate_preview_path = {}", candidate_preview_path.display());
            return Some(candidate_preview_path.into_os_string().into_string().unwrap());
        }
    }
    return None
}

fn find_configuration()  {
    let app_data_result = env::var("APPDATA");
    if !app_data_result.is_ok() {
        println!("{}", "unimp 1");
        unimplemented!();
    }

    let app_data_dir = app_data_result.unwrap();
    let preferences_relpath = "Adobe/Lightroom/Preferences/Lightroom Classic CC 7 Preferences.agprefs";  
    let expected_adobe_prefs = app_data_dir + "/" + preferences_relpath;
    let cat_path = get_library_path_from_config_file(&expected_adobe_prefs);
    if !cat_path.is_ok() {
        println!("library_path was not defined");
        return
    }
    let cat_path_value = cat_path.unwrap();
    println!("library_path = {}", cat_path_value);
    let cat_parent = Path::new(&cat_path_value).parent();
    if cat_parent.is_none()
    {
        return;
    }
    let cat_directory = cat_parent.unwrap();
    // todo: I'm a bit lazy here, forcing the path to unwrap
    let helper_glob = glob(cat_directory.join("**/metadatahelper.db").to_str().unwrap());
    if !helper_glob.is_ok() {
        return
    }
    let helper_paths = helper_glob.unwrap();
    for entry in helper_paths {
        if let Ok(candidate_metadata_path) = entry {
            println!("candidate_metadata_path = {}", candidate_metadata_path.display());
        }
    }

    let preview_glob = glob(cat_directory.join("*Previews*/previews.db").to_str().unwrap());
    if !preview_glob.is_ok() {
        return
    }

    let preview_paths = preview_glob.unwrap();
    for entry in preview_paths {
        if let Ok(candidate_preview_path) = entry {
            println!("candidate_preview_path = {}", candidate_preview_path.display());
        }
    }

}

#[tauri::command]
fn get_image_for_id(image_id: String) {
    // I can invoke this, from the frontend, and this code executes properly
    // TODO: need to take an image_id, and map it to the file in the previews
    // TODO: need to return the image to the frontend
    let _image_result = lrprev::get_jpegs_from_file(
        r"C:\Users\andyr\OneDrive\Pictures\8AEF1EC2-56E1-4628-A4B5-E5DE6944D6FD-46674b86598837cc1969a390cec94d22.lrprev"
    );
    println!("called with {}", image_id)
    /*
    if image_result.is_ok() {
        let loaded_images = image_result.unwrap();
        for im in loaded_images {
            let _ = im.save("dumped_im.jpeg");
        }
    }
    */
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

static ASCII_LOWER: [char; 26] = [
    'a', 'b', 'c', 'd', 'e', 
    'f', 'g', 'h', 'i', 'j', 
    'k', 'l', 'm', 'n', 'o',
    'p', 'q', 'r', 's', 't', 
    'u', 'v', 'w', 'x', 'y', 
    'z',
];

fn allow_all_ascii_drives(app : &mut tauri::App)
{
    let scope = app.fs_scope();
    for dletter in ASCII_LOWER {
        // don't hate me, it's really fiddly to get access to what are valid drives,
        // and we just need to configure the fs:plugin not to reject requests
        // it's very possible that this won't matter at all
        let _ = scope.allow_directory(dletter.to_string() + ":", true);
    }
}

fn allow_detected_drives(app : &mut tauri::App)
{
    let scope = app.fs_scope();
    // fixme: solve errors!
    let disks = Disks::new_with_refreshed_list();
    for disk in &disks {
        let mp = disk.mount_point();
        // assume this works ...
        let _ = scope.allow_directory(mp, true);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_system_info::init())
        .setup(|app| {
            let _ = find_configuration();
            let preview_db_path = get_preview_db_path();
            if preview_db_path.is_some() {
                // TODO: BLOCKING IS BAD
                // block_on(do_sql(&preview_db_path.unwrap()));
                let image_id_to_image = block_on(do_sql(&preview_db_path.unwrap()));
                app.manage(AppState{
                    image_id_to_image: image_id_to_image
                });
            }
            else {
                unimplemented!();
            }
            // allowed the given directory
            // allow_all_ascii_drives(app);
            allow_detected_drives(app);
            // let _ = scope.allow_directory("/", true);
            // fixme: check os?
            // dbg!(scope.allowed());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_image_for_id])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
