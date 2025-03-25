// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{ipc::Response};
use anyhow::{Result, Context};
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
use serde::{Serialize, Deserialize, Serializer};
mod lrprev;

struct AppState {
    conf_dirs: ConfDirs,
    image_id_to_image: HashMap<u64, PreviewData>
}

fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where P: AsRef<Path>, {
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
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
    }
    else {
        println!("{}", "all is not wel");
    }   
    return image_id_to_image;
}

#[derive(Serialize, Deserialize, Debug)]
struct ConfDirs {
    root: String,
    cat_path: String,
    metadata_db_path: String,
    preview_db_path: String,
    preview_root: String
}

impl Clone for ConfDirs {
    fn clone(&self) -> Self {
        ConfDirs{
            root: self.root.clone(),
            cat_path: self.cat_path.clone(),
            metadata_db_path: self.metadata_db_path.clone(),
            preview_db_path: self.preview_db_path.clone(),
            preview_root: self.preview_root.clone()
        }
    }
}

fn find_configuration() -> Option<ConfDirs> {
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
        return None;
    }
    let cat_path_value = cat_path.unwrap();
    println!("library_path = {}", cat_path_value);
    let cat_parent = Path::new(&cat_path_value).parent();
    if cat_parent.is_none()
    {
        return None;
    }
    let cat_directory = cat_parent.unwrap();
    // todo: I'm a bit lazy here, forcing the path to unwrap
    let helper_glob = glob(cat_directory.join("**/metadatahelper.db").to_str().unwrap());
    if !helper_glob.is_ok() {
        return None;
    }
    let helper_paths = helper_glob.unwrap();
    let mut metadata_db_path : Option<String> = None;
    for entry in helper_paths {
        if let Ok(candidate_metadata_path) = entry {
            println!("candidate_metadata_path = {}", candidate_metadata_path.display());
            metadata_db_path = Some(candidate_metadata_path.into_os_string().into_string().unwrap());
        }
    }

    let preview_glob = glob(cat_directory.join("*Previews*/previews.db").to_str().unwrap());
    if !preview_glob.is_ok() {
        return None;
    }

    let preview_paths = preview_glob.unwrap();
    let mut preview_db_path : Option<String> = None;
    for entry in preview_paths {
        if let Ok(candidate_preview_path) = entry {
            println!("candidate_preview_path = {}", candidate_preview_path.display());
            preview_db_path = Some(candidate_preview_path.into_os_string().into_string().unwrap());
        }
    }

    let preview_db_path_value : String = preview_db_path.unwrap();
    let preview_root = Path::new(&preview_db_path_value).parent().unwrap().to_str().unwrap().to_owned();

    return Some(ConfDirs{
        root: cat_directory.to_str().unwrap().to_owned(),
        cat_path: cat_path_value,
        metadata_db_path: metadata_db_path.unwrap(),
        preview_db_path: preview_db_path_value,
        preview_root: preview_root
    })

}

fn format_preview_filepath(preview_root: &str, image: &PreviewData) -> String
{
    return Path::new(&preview_root).join(
        &image.uuid[0 .. 1]
    ).join(
        &image.uuid[0 .. 4]
    ).join(
        image.uuid.clone() + "-" + &image.digest + ".lrprev"
    ).as_os_str().to_str().unwrap().to_owned();
}

#[tauri::command]
fn get_preview_path_for_image_id(state: tauri::State<AppState>, image_id: &str) -> Option<String>
{

    // fixme: this code needs to handle errors!
    let image_id_int = image_id.parse::<u64>();
    if !image_id_int.is_ok() {
        return None;
    }
    let maybe_image = state.image_id_to_image.get(&image_id_int.unwrap());
    if !maybe_image.is_some() {
        return None;
    }

    return Some(format_preview_filepath(&state.conf_dirs.preview_root, maybe_image.unwrap()));
    
}

// this is pinched from tauri-fs's implementation

#[derive(Debug, thiserror::Error)]
pub enum ReflexCommandError {
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error)
}

impl From<&str> for ReflexCommandError {
    fn from(value: &str) -> Self {
        Self::Anyhow(anyhow::anyhow!(value.to_string()))
    }
}

impl Serialize for ReflexCommandError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // TODO: this is currently a warning, because ReflexCommandError is currently *only*
        // a wrapper around anyhow::Error, this is unlikely to be true forever
        if let Self::Anyhow(err) = self {
            serializer.serialize_str(format!("{err:#}").as_ref())
        } else {
            serializer.serialize_str(self.to_string().as_ref())
        }
    }
}
pub type CommandResult<T> = std::result::Result<T, ReflexCommandError>;


#[tauri::command]
fn get_image_for_id(state: tauri::State<AppState>, image_id: String, mode: String) -> CommandResult<tauri::ipc::Response> {
    if mode != "hi" && mode != "lo"
    {
        return Err(
            ReflexCommandError::from(
                anyhow::anyhow!("ArgumentError: mode must be 'hi' or 'lo'")
                    .context(format!("received {}", mode))
            )
        );
    }
    let preview_path = get_preview_path_for_image_id( state, &image_id );
    if !preview_path.is_some()
    {

        return Err(ReflexCommandError::from(
            anyhow::anyhow!("Preview does not exist")
                .context(format!("for image_id {}", image_id))
        ));
    }
    let pps = preview_path.unwrap();
    let image_result = lrprev::get_jpeg_byte_segments_from_file(
        &pps    
    );
    if image_result.is_ok() {
        let loaded_image_bytes = image_result.unwrap();
        if loaded_image_bytes.len() == 0
        {
            return Err(
                ReflexCommandError::from(
                    anyhow::anyhow!("Found no images in preview file")
                        .context(format!("for image_id {}", image_id))
                )
            );
        }
        if mode == "hi"
        {
            let bytes : Vec<u8> = loaded_image_bytes.get(0).unwrap().to_owned();
            return Ok(Response::new(bytes));
        }
        if mode == "lo"
        {
            let bytes = loaded_image_bytes.get(loaded_image_bytes.len() - 1).unwrap().to_owned();
            return Ok(Response::new(bytes));
        }
        return Err(
            ReflexCommandError::from(
                anyhow::anyhow!("Failed to provide image (despite image loaded)")
                    .context(format!("for image_id {}", image_id))
            )
        );
    }
    else {
        return Err(
            ReflexCommandError::from(
                anyhow::anyhow!("Failed to load image")
                    .context(format!("for image_id {}", image_id))
            )
        );
    }
    
}


#[tauri::command]
fn get_app_state(state: tauri::State<AppState>) -> CommandResult<ConfDirs> {
   return Ok(state.conf_dirs.clone());
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
            let conf_dirs = find_configuration().unwrap();
            // TODO: BLOCKING IS BAD
            // block_on(do_sql(&preview_db_path.unwrap()));
            let image_id_to_image = block_on(do_sql(&conf_dirs.preview_db_path));
            app.manage(AppState{
                conf_dirs: conf_dirs,
                image_id_to_image: image_id_to_image
            });
            // allowed the given directory
            // allow_all_ascii_drives(app);
            allow_detected_drives(app);
            // let _ = scope.allow_directory("/", true);
            // fixme: check os?
            // dbg!(scope.allowed());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_image_for_id])
        .invoke_handler(tauri::generate_handler![get_app_state])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
