use std;
use std::fs;
use anyhow;
use rexif::{ExifTag, TagValue};
use std::collections::HashMap;

fn read_file_with_rexif(filename: &String, filter_tags: Option<&Vec<ExifTag>>) -> Option<Vec<(ExifTag, TagValue)>>
{
    let parse_result = rexif::parse_file(&filename);
    let mut exif_data : Vec<(ExifTag, TagValue)> = Vec::new();
    if parse_result.is_ok()
    {
        let entries = parse_result.unwrap().entries;
        for entry in entries {
            if entry.tag == ExifTag::UnknownToMe {
                /*
                println!("\t{} {}",
                    entry.tag_readable, entry.value_readable);
                */
            } else {
                if filter_tags.is_some()
                {
                    if filter_tags.as_ref().unwrap().contains(&entry.tag)
                    {
                        exif_data.push((entry.tag, entry.value));
                    }
                }
                else
                {
                    exif_data.push((entry.tag, entry.value));
                }
            }
        }
    }
    else
    {
        eprintln!("Error in {}: {}", &filename, parse_result.unwrap_err());
        return None;
    }
    return Some(exif_data);
}

pub type Metadata = Vec<(ExifTag, TagValue)>;

pub fn index_folder(path: &String, filter_tags: Option<&Vec<ExifTag>>) -> anyhow::Result<HashMap<String, Metadata>>
{
    let mut file_metadata : HashMap<String, Metadata> = HashMap::new();
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
            let sub_result =  index_folder(conv_path.as_ref().unwrap(), filter_tags);
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
            let exif_data_maybe = read_file_with_rexif(&conv_path_val, filter_tags);
            file_metadata.insert(conv_path_val, exif_data_maybe.unwrap());
        }
    }
    return Ok(file_metadata);
}