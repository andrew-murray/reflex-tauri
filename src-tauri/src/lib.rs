// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use anyhow::Result;
use futures::executor::block_on;
use glob::glob;
use serde::{Deserialize, Serialize, Serializer};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::ConnectOptions;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;
use std::sync::Mutex;
use sysinfo::Disks;
use tauri::ipc::Response;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_fs::FsExt;
use tauri_plugin_opener::OpenerExt;
use crate::image_data::ImageMetadataFields;

mod lrprev;
mod image_folder;
mod image_data;

#[derive(Serialize, Deserialize, Debug)]
struct SharedAppState {
    // lightroom mode
    conf_dirs: Option<LightroomConfDirs>,
    // folder_search_mode
    root_dir: Option<String>
}

impl Clone for SharedAppState {
    fn clone(&self) -> Self {
        SharedAppState {
            conf_dirs: self.conf_dirs.clone(),
            root_dir: self.root_dir.clone()
        }
    }
}

struct AppState {
    shared: SharedAppState,
    // folder mode
    image_db_from_files: Vec<image_data::ImageMetadataFields>,
    image_db_to_index: HashMap<String, usize>,
    // common?
    image_id_to_image: Option<HashMap<u64, PreviewData>>,
}

fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn get_library_path_from_config_file(adobe_config_path: &str) -> Result<String, ()> {
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
                let library_path: String = parts_collected[1..]
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

async fn do_sql(preview_db_path: &str) -> HashMap<u64, PreviewData> {
    let connection = SqliteConnectOptions::new()
        .read_only(true)
        .filename(preview_db_path);
    let mut db = connection.connect().await.unwrap();
    let qresult = sqlx::query!("select imageId, uuid, digest, orientation from ImageCacheEntry")
        .fetch_all(&mut db)
        .await;
    let mut image_id_to_image = HashMap::new();
    if qresult.is_ok() {
        let qr = qresult.unwrap();
        for image in qr {
            image_id_to_image.insert(
                image.imageId as u64,
                PreviewData {
                    image_id: image.imageId as u64,
                    digest: image.digest,
                    uuid: image.uuid,
                    orientation: image.orientation,
                },
            );
        }
    } else {
        println!("{}", "all is not wel");
    }
    return image_id_to_image;
}

#[derive(Serialize, Deserialize, Debug)]
struct LightroomConfDirs {
    root: String,
    cat_path: String,
    metadata_db_path: String,
    preview_db_path: String,
    preview_root: String,
}

impl Clone for LightroomConfDirs {
    fn clone(&self) -> Self {
        LightroomConfDirs {
            root: self.root.clone(),
            cat_path: self.cat_path.clone(),
            metadata_db_path: self.metadata_db_path.clone(),
            preview_db_path: self.preview_db_path.clone(),
            preview_root: self.preview_root.clone(),
        }
    }
}

fn find_configuration() -> Option<LightroomConfDirs> {
    let app_data_result = env::var("APPDATA");
    if !app_data_result.is_ok() {
        println!("{}", "unimp 1");
        return None;
    }

    let app_data_dir = app_data_result.unwrap();
    let preferences_relpath =
        "Adobe/Lightroom/Preferences/Lightroom Classic CC 7 Preferences.agprefs";
    let expected_adobe_prefs = app_data_dir + "/" + preferences_relpath;
    let cat_path = get_library_path_from_config_file(&expected_adobe_prefs);
    if !cat_path.is_ok() {
        println!("library_path was not defined");
        return None;
    }
    let cat_path_value = cat_path.unwrap();
    println!("library_path = {}", cat_path_value);
    let cat_parent = Path::new(&cat_path_value).parent();
    if cat_parent.is_none() {
        return None;
    }
    let cat_directory = cat_parent.unwrap();
    // todo: I'm a bit lazy here, forcing the path to unwrap
    let helper_glob = glob(cat_directory.join("**/metadatahelper.db").to_str().unwrap());
    if !helper_glob.is_ok() {
        return None;
    }
    let helper_paths = helper_glob.unwrap();
    let mut metadata_db_path: Option<String> = None;
    for entry in helper_paths {
        if let Ok(candidate_metadata_path) = entry {
            println!(
                "candidate_metadata_path = {}",
                candidate_metadata_path.display()
            );
            metadata_db_path = Some(
                candidate_metadata_path
                    .into_os_string()
                    .into_string()
                    .unwrap(),
            );
        }
    }

    let preview_glob = glob(
        cat_directory
            .join("*Previews*/previews.db")
            .to_str()
            .unwrap(),
    );
    if !preview_glob.is_ok() {
        return None;
    }

    let preview_paths = preview_glob.unwrap();
    let mut preview_db_path: Option<String> = None;
    for entry in preview_paths {
        if let Ok(candidate_preview_path) = entry {
            println!(
                "candidate_preview_path = {}",
                candidate_preview_path.display()
            );
            preview_db_path = Some(
                candidate_preview_path
                    .into_os_string()
                    .into_string()
                    .unwrap(),
            );
        }
    }

    let preview_db_path_value: String = preview_db_path.unwrap();
    let preview_root = Path::new(&preview_db_path_value)
        .parent()
        .unwrap()
        .to_str()
        .unwrap()
        .to_owned();

    return Some(LightroomConfDirs {
        root: cat_directory.to_str().unwrap().to_owned(),
        cat_path: cat_path_value,
        metadata_db_path: metadata_db_path.unwrap(),
        preview_db_path: preview_db_path_value,
        preview_root: preview_root,
    });
}

fn format_preview_filepath(preview_root: &str, image: &PreviewData) -> String {
    return Path::new(&preview_root)
        .join(&image.uuid[0..1])
        .join(&image.uuid[0..4])
        .join(image.uuid.clone() + "-" + &image.digest + ".lrprev")
        .as_os_str()
        .to_str()
        .unwrap()
        .to_owned();
}

#[tauri::command]
fn get_preview_path_for_image_id(state: tauri::State<AppState>, image_id: &str) -> Option<String> {
    // fixme: this code needs to handle errors!
    let image_id_int = image_id.parse::<u64>();
    if !image_id_int.is_ok() {
        // todo: log
        return None;
    }
    if !state.image_id_to_image.is_some() && state.shared.conf_dirs.is_some() {
        // todo: log
        return None;
    }
    let maybe_image = state.image_id_to_image.as_ref().unwrap().get(&image_id_int.unwrap());
    if !maybe_image.is_some() {
        return None;
    }

    return Some(format_preview_filepath(
        &state.shared.conf_dirs.as_ref().unwrap().preview_root,
        maybe_image.unwrap(),
    ));
}

// this is pinched from tauri-fs's implementation

#[derive(Debug, thiserror::Error)]
pub enum ReflexCommandError {
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
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
fn get_image_for_id(
    state: tauri::State<AppState>,
    image_id: String,
    image_path: String,
    mode: String,
) -> CommandResult<tauri::ipc::Response> {
    if mode != "hi" && mode != "lo" {
        return Err(ReflexCommandError::from(
            anyhow::anyhow!("ArgumentError: mode must be 'hi' or 'lo'")
                .context(format!("received {}", mode)),
        ));
    }
    let preview_path = get_preview_path_for_image_id(state, &image_id);
    if !preview_path.is_some() {
        // fallback to loading raw
        // let raw_exists = fs::exists(&image_path).unwrap_or(false);
        // if raw_exists
        // {
        //     let raw_result = rawloader::decode_file(&image_path);
        // }
        // else {
        return Err(ReflexCommandError::from(
            anyhow::anyhow!("Preview does not exist and raw file not accessible")
                .context(format!("for image_id {}", image_id))
                .context(format!("for image_path {}", image_path)),
        ));
        // }
    }

    let pps = preview_path.unwrap();
    let image_result = lrprev::get_jpeg_byte_segments_from_file(&pps);
    if image_result.is_ok() {
        let loaded_image_bytes = image_result.unwrap();
        if loaded_image_bytes.len() == 0 {
            return Err(ReflexCommandError::from(
                anyhow::anyhow!("Found no images in preview file")
                    .context(format!("for image_id {}", image_id)),
            ));
        }
        if mode == "lo" {
            let bytes: Vec<u8> = loaded_image_bytes.get(0).unwrap().to_owned();
            return Ok(Response::new(bytes));
        }
        if mode == "hi" {
            let bytes = loaded_image_bytes
                .get(loaded_image_bytes.len() - 1)
                .unwrap()
                .to_owned();
            return Ok(Response::new(bytes));
        }
        return Err(ReflexCommandError::from(
            anyhow::anyhow!("Failed to provide image (despite image loaded)")
                .context(format!("for image_id {}", image_id)),
        ));
    } else {
        return Err(ReflexCommandError::from(
            anyhow::anyhow!("Failed to load image").context(format!("for image_id {}", image_id)),
        ));
    }
}

#[tauri::command]
fn get_shared_app_state(state: tauri::State<Mutex<AppState>>) -> CommandResult<SharedAppState> {
    let locked_state = state.lock().unwrap();
    return Ok(locked_state.shared.clone());
}

fn allow_detected_drives(app: &mut tauri::App) {
    let scope = app.fs_scope();
    // fixme: solve errors!
    let disks = Disks::new_with_refreshed_list();
    for disk in &disks {
        let mp = disk.mount_point();
        // assume this works ...
        let _ = scope.allow_directory(mp, true);
    }
}

// TODO: Manage app startup flow as it needs to discover metahelper.db and image_preview.db
// TODO: Fix the UI for the app startup flow, when we fail to find the lightroom database
// TODO: Implement flow to manage folder browsing
fn maybe_image_data(tup: &(image_folder::ImagePaths, Option<image_folder::ImageData>)) -> image_data::ImageMetadataFields
{
    if tup.1.is_some()
    {
        return image_folder::make_image_data_from_exif(
            Some(tup.0.folder.clone()),
            tup.0.filepath.clone(),
            &tup.1.as_ref().unwrap().tags
        );
    }
    else
    {
        let empty_tags = Vec::new();
        return image_folder::make_image_data_from_exif(
            Some(tup.0.folder.clone()),
            tup.0.filepath.clone(),
            &empty_tags
        );
    }
}

fn update_app_state_for_folder(app: &tauri::AppHandle, folder: &String)
{
    let image_index = image_folder::index_folder(folder);
    if image_index.is_err()
    {
        let app_state = app.state::<Mutex<AppState>>();
        let mut mutable_app_state = app_state.lock().unwrap();
        // MutexGuard<T> implements deref-able
        *mutable_app_state = AppState {
            shared: SharedAppState {
                conf_dirs: None,
                root_dir: None,
            },
            image_id_to_image: None,
            image_db_from_files: Vec::new(),
            image_db_to_index: HashMap::new()
        };
    }
    else
    {
        let image_db = image_index.unwrap();
        // there's probably a far-more-efficient way of doing this
        let image_db_key_to_index = image_db
            .keys()
            .enumerate()
            .map(|(i, k)| (k.clone(), i))
            .collect::<HashMap<String, usize>>();
        for entry in image_db.keys()
        {
            println!("{}", entry);
        }
        let image_db_values : Vec<ImageMetadataFields> = image_db
            .values()
            .map(maybe_image_data)
            .collect();
        for x in image_db_values.iter()
        {
            println!("{:?}", x);
        }
        let app_state = app.state::<Mutex<AppState>>();
        let mut mutable_app_state = app_state.lock().unwrap();
        // MutexGuard<T> implements deref-able
        *mutable_app_state = AppState {
            shared: SharedAppState {
                conf_dirs: None,
                root_dir: Some(folder.clone()),
            },
            image_id_to_image: None,
            image_db_from_files: image_db_values,
            image_db_to_index: image_db_key_to_index
        };
    }
}

fn initialise_app_state(app: &mut tauri::App)
{
    let conf_dirs_maybe = find_configuration();
    if conf_dirs_maybe.is_some()
    {
        let conf_dirs = conf_dirs_maybe.unwrap();
        // TODO: BLOCKING IS BAD
        // block_on(do_sql(&preview_db_path.unwrap()));
        let image_id_to_image = block_on(do_sql(&conf_dirs.preview_db_path));
        let app_state = AppState {
            shared: SharedAppState {
                conf_dirs: Some(conf_dirs),
                root_dir: None,
            },
            image_id_to_image: Some(image_id_to_image),
            image_db_from_files: Vec::new(),
            image_db_to_index: HashMap::new()
        };
        app.manage(Mutex::new(app_state));
    }
    else {
        /* maybe re-enable this, if my dev-cycle is slow
        let target = r"C:\projects\ambio\content\images\2025\bcn\20250115 Barcelona Gothic Barceloneta".to_string();
        update_app_state_for_folder(app, target);
        */
        let app_state = AppState {
            shared: SharedAppState {
                conf_dirs: None,
                root_dir: None,
            },
            image_id_to_image: None,
            image_db_from_files: Vec::new(),
            image_db_to_index: HashMap::new()
        };
        app.manage(Mutex::new(app_state));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_system_info::init())
        .setup(|app| {
            initialise_app_state(app);

            // allowed the given directory
            // allow_all_ascii_drives(app);
            allow_detected_drives(app);

            let file_menu = SubmenuBuilder::new(app, "File")
                .text("open folder", "Open Folder")
                .text("open cat", "Open Lightroom Catalog")
                .separator()
                // .text("settings", "Settings")
                // .separator()
                .text("quit", "Quit")
                .build()?;
            let help_menu = SubmenuBuilder::new(app, "Help")
                .text("help", "Documentation")
                .text("about", "About")
                .build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &help_menu])
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app: &tauri::AppHandle, event| {
                println!("menu event: {:?}", event.id());

                match event.id().0.as_str() {
                    "open folder" => {
                        let folder_path = app.dialog().file().blocking_pick_folder();
                        if folder_path.is_none() {
                            println!("{}", "folder_path was not selected");
                        } else {
                            let fpath = folder_path.unwrap().to_string();
                            update_app_state_for_folder(app, &fpath);
                            println!("emitting event {}", "shared-app-state-set");
                            let _ = app.emit("shared-app-state-set", {});
                        }
                    }
                    "open cat" => {
                        let file_path = app.dialog().file().blocking_pick_file();
                        if file_path.is_none() {
                            println!("{}", "file_path was not selected");
                        } else {
                            println!("file_path: {}", file_path.unwrap());
                        }
                    }
                    // "settings" => {
                    //     println!("expected but unimplemented event with id {:?}", event.id());
                    // }
                    "quit" => {
                        app.exit(0);
                    }
                    "help" => {
                        let _res = app.opener().open_url("https://tauri.app",  None::<&str>);
                    }
                    "about" => {
                        let _ans = app
                            .dialog()
                            .message("reflex version: dev.1.2")
                            .kind(MessageDialogKind::Info)
                            .blocking_show();
                    }
                    _ => {
                        println!("expected but unimplemented event with id {:?}", event.id());
                    }
                }
            });

            // let _ = scope.allow_directory("/", true);
            // fixme: check os?
            // dbg!(scope.allowed());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_shared_app_state, get_image_for_id])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
