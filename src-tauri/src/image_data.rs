use serde::{Deserialize, Serialize, Serializer};
/*
use tauri_plugin_sql::{Migration, MigrationKind};

// TODO: M1_down?
pub const M1 : Migration = Migration {
    version: 1,
    description: "create_initial_tables",
    sql: "CREATE TABLE ImageMetadata (\
            id INTEGER PRIMARY KEY,\
            folder TEXT NOT NULL,\
            filename TEXT NOT NULL,\
            datetime_original datetime,\
            model TEXT,\
            lens_model TEXT,\
            shutter_speed_value REAL,\
            aperture_value REAL,\
            focal_length REAL,\
            iso_speed_rating INTEGER,\
            exposure_program INTEGER,\
            metering_mode INTEGER,\
            flash INTEGER\
        );",
    kind: MigrationKind::Up,
};
 */

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ImageMetadataFields
{
    pub folder: Option<String>,
    pub filename: String,
    pub datetime_original: Option<String>,
    pub model: Option<String>,
    pub lens_model: Option<String>,
    pub shutter_speed_value: Option<(u32,u32)>,
    pub aperture_value: Option<f64>,
    pub focal_length: Option<f64>,
    pub iso_speed_rating: Option<u16>,
    pub exposure_program: Option<u16>,
    pub metering_mode: Option<u16>,
    pub flash: Option<u16>,
}

/*
const tags : [ExifTag; 10] = [
    ExifTag::DateTimeOriginal, // ascii "YYYY:MM:DD HH:MM:SS"+0x00
    ExifTag::Model, // ascii
    ExifTag::LensModel, // ascii
    ExifTag::ShutterSpeedValue, // signed rational
    ExifTag::ApertureValue, // unsigned rational
    ExifTag::FocalLength, // unsigned rational
    // unsigned short
    ExifTag::ISOSpeedRatings,
    // unsigned short
    // ('1' means manual control, '2' program normal, '3' aperture priority,
    // '4' shutter priority, '5' program creative (slow program), '6' program action(high-speed program),
    // '7' portrait mode, '8' landscape mode.)
    ExifTag::ExposureProgram,
    // unsigned short
    // ( '1' means average, '2' center weighted average, '3' spot, '4' multi-spot, '5' multi-segment.)
    ExifTag::MeteringMode,
    ExifTag::Flash, // unsigned short ('1' means flash was used, '0' means not used.)
];
 */
