use std;
use std::fs;
use anyhow;
use rexif::*;
use std::collections::HashMap;

#[derive(Clone)]
enum DataVariant {
    Integer(i64),
    SignedRational(f64),
    UnsignedRational(f64),
    Ascii(String)
}

const tags : [ExifTag; 10] = [
    ExifTag::DateTimeOriginal,
    ExifTag::Model,
    ExifTag::LensModel,
    ExifTag::ShutterSpeedValue,
    ExifTag::ApertureValue,
    ExifTag::FocalLength,
    ExifTag::ISOSpeedRatings,
    ExifTag::ExposureMode,
    ExifTag::MeteringMode,
    ExifTag::Flash,
];

pub type Metadata = Vec<(ExifTag, TagValue)>;

#[derive(Clone)]
pub struct ImageData
{
    data: HashMap<String, Option<DataVariant>>,
    tags: Vec<ExifEntry>
}

#[derive(PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Clone)]
pub struct ImagePaths
{
    folder: String,
    filepath: String
}

fn read_file_with_rexif(folder: &String, filename: &String) -> (ImagePaths, Option<ImageData>)
{
    let parse_result = rexif::parse_file(&filename);
    let paths = ImagePaths{
        folder: folder.clone(),
        filepath: filename.clone()
    };
    if parse_result.is_ok()
    {
        let exif_data = parse_result.unwrap().entries;
        for entry in exif_data.iter() {
            println!("{:?}", entry);
        }
        let mut data_map = HashMap::new();
        for t in tags {
            let entry_maybe = exif_data.iter().find(|x| x.tag == t);
            if entry_maybe.is_some()
            {
                let entry_val = entry_maybe.unwrap();
                let optional_variant = match &(entry_val.value) {
                    TagValue::Ascii(ref v) => Some(DataVariant::Ascii(v.clone())),
                    TagValue::U8(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    TagValue::U16(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    TagValue::U32(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    TagValue::I8(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    TagValue::I16(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    TagValue::I32(_) => Some(DataVariant::Integer(entry_val.value.to_i64(0).unwrap())),
                    // floaty bobs
                    // I use the more direct syntax here, to remind myself that both are possible
                    // this code will have to be smart to zero-vectors or > 1 size vectors eventually
                    TagValue::F32(ref v) => Some(DataVariant::SignedRational(v.get(0).unwrap().clone() as f64)),
                    TagValue::F64(ref v) => Some(DataVariant::UnsignedRational(v.get(0).unwrap().clone())),
                    TagValue::IRational(_) => Some(DataVariant::SignedRational(entry_val.value.to_f64(0).unwrap())),
                    TagValue::URational(_) => Some(DataVariant::UnsignedRational(entry_val.value.to_f64(0).unwrap())),
                    _ => None
                };
                // TODO: warn if optionalVariant is None
                // TODO: Handle multi-vector/zero-vector gracefully
                data_map.insert(t.to_string(), optional_variant);
            }
            else
            {
                data_map.insert(t.to_string(), None);
            }
        }
        let image_data = ImageData {
            data: data_map,
            tags: exif_data
        };
        return (paths, Some(image_data));
    }
    else
    {
        eprintln!("Error in {}: {}", &filename, parse_result.unwrap_err());
        return (paths, None);
    }
}

pub fn index_folder(path: &String) -> anyhow::Result<HashMap<String, (ImagePaths, Option<ImageData>)>>
{
    let mut file_metadata : HashMap<String, (ImagePaths, Option<ImageData>)> = HashMap::new();
    for entry in fs::read_dir(&path)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir()
        {
            let conv_path = path.into_os_string().into_string();
            if conv_path.is_err()
            {
                // todo: log, rather than end?
                return Err(anyhow::Error::from(
                    anyhow::anyhow!("Failed to convert os path to string")
                ));
            }
            let sub_result =  index_folder(conv_path.as_ref().unwrap());
            if sub_result.is_ok()
            {
                file_metadata.extend(sub_result.unwrap());
            }
            else
            {
                // some sort of error!
            }
        }
        else if path.is_file()
        {
            let conv_path = path.into_os_string().into_string();
            if conv_path.is_err()
            {
                // todo: log, rather than end?
                return Err(anyhow::Error::from(
                    anyhow::anyhow!("Failed to convert os path to string")
                ));
            }
            // we force
            let conv_path_val = conv_path.unwrap();
            let dumb_folder = "".to_string();
            let load_result = read_file_with_rexif(&dumb_folder, &conv_path_val);
            if load_result.1.is_some()
            {
                // println!("{:?}", load_result.1.as_ref().unwrap());
            }
            file_metadata.insert(conv_path_val, load_result);
        }
    }
    return Ok(file_metadata);
}
