use std;
use std::fs;
use anyhow;
use rexif::*;
use std::collections::HashMap;
use xmp_toolkit::{IterOptions, OpenFileOptions, XmpFile};
use crate::image_data;
use rayon::prelude::*;

#[derive(Clone)]
enum DataVariant {
    Integer(i64),
    SignedRational(f64),
    UnsignedRational(f64),
    Ascii(String)
}

const TAGS : [ExifTag; 10] = [
    ExifTag::DateTimeOriginal, // ascii "YYYY:MM:DD HH:MM:SS"+0x00
    ExifTag::Model, // ascii
    ExifTag::LensModel, // ascii
    ExifTag::ShutterSpeedValue, // signed rational
    ExifTag::ApertureValue, // unsigned rational
    ExifTag::FocalLength, // unsigned rational
    ExifTag::ISOSpeedRatings, // unsigned short
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

pub type Metadata = Vec<(ExifTag, TagValue)>;

#[derive(Clone)]
pub struct ImageData
{
    pub data: HashMap<String, Option<DataVariant>>,
    pub tags: Vec<ExifEntry>
}

#[derive(PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Clone)]
pub struct ImagePaths
{
    pub folder: String,
    pub filepath: String
}

// this function only handles exactly the right type
// TODO: I'd like the get_X_from_tags to be generic, but I don't quite have the rust
// chops to map between Tag::Value::U8 and a real type
// and "name" those in the function
pub fn get_string_from_tags(exif_data: &Vec<ExifEntry>, tag: ExifTag) -> Option<String>
{
    let entry_maybe = exif_data.iter().find(|x| x.tag == tag);
    if entry_maybe.is_none()
    {
        return None;
    }

    let entry_val = entry_maybe.unwrap();
    let res = match &(entry_val.value) {
        TagValue::Ascii(vec) => Some(vec.clone()),
        _ => None
    };
    return res;
}


// this function only handles exactly the right type
// TODO: I'd like the get_X_from_tags to be generic, but I don't quite have the rust
// chops to map between Tag::Value::U8 and a real type
// and "name" those in the function

pub fn get_u8_from_tags(exif_data: &Vec<ExifEntry>, tag: ExifTag) -> Option<u8>
{
    let entry_maybe = exif_data.iter().find(|x| x.tag == tag);
    if entry_maybe.is_none()
    {
        return None;
    }

    let entry_val = entry_maybe.unwrap();
    let res = match &(entry_val.value) {
        TagValue::U8(vec) => vec.get(0).cloned(),
        _ => None
    };
    return res;
}

// this function only handles exactly the right type
pub fn get_u16_from_tags(exif_data: &Vec<ExifEntry>, tag: ExifTag) -> Option<u16>
{
    let entry_maybe = exif_data.iter().find(|x| x.tag == tag);
    if entry_maybe.is_none()
    {
        return None;
    }

    let entry_val = entry_maybe.unwrap();
    let res = match &(entry_val.value) {
        TagValue::U16(vec) => vec.get(0).cloned(),
        _ => None
    };
    return res;
}

// this function eagerly converts rational types to f64
pub fn get_f64_from_tags(exif_data: &Vec<ExifEntry>, tag: ExifTag) -> Option<f64>
{
    let entry_maybe = exif_data.iter().find(|x| x.tag == tag);
    if entry_maybe.is_none()
    {
        return None;
    }

    let entry_val = entry_maybe.unwrap();
    let res = match &(entry_val.value) {
        // this code will have to be smart to zero-vectors or > 1 size vectors eventually
        TagValue::F32(ref v) => Some(v.get(0).unwrap().clone() as f64),
        TagValue::F64(ref v) => Some(v.get(0).unwrap().clone()),
        TagValue::IRational(_) => Some(entry_val.value.to_f64(0).unwrap()),
        TagValue::URational(_) => Some(entry_val.value.to_f64(0).unwrap()),
        _ => None
    };
    return res;
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
        // for entry in exif_data.iter() {
        //     println!("{:?}", entry);
        // }
        let mut data_map = HashMap::new();
        for t in TAGS {
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

pub fn gather_eligible_files(original_root_path: &String, root_path: &String) ->  anyhow::Result<Vec<String>>
{
    let mut eligible_filepaths = Vec::new();
    for entry in fs::read_dir(&root_path)? {
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
            let sub_result =  gather_eligible_files(original_root_path, conv_path.as_ref().unwrap());
            if sub_result.is_ok()
            {
                eligible_filepaths.extend(sub_result.unwrap());
            }
            else
            {
                // todo: log, rather than end?
                return Err(anyhow::Error::from(
                    anyhow::anyhow!("Sub-operation failed")
                ));
            }
        }
        else if path.is_file() // && is_eligible? Some sort of image filter
        {
            let conv_path = path.into_os_string().into_string();
            if conv_path.is_err()
            {
                // todo: log, rather than end?
                return Err(anyhow::Error::from(
                    anyhow::anyhow!("Failed to convert os path to string")
                ));
            }
            let cpu = conv_path.unwrap();
            eligible_filepaths.push(cpu);
        }
    }
    return Ok(eligible_filepaths);
}

pub fn load_images_in_parallel(original_root_path: &String, filenames: &Vec<String>)  -> anyhow::Result<HashMap<String, (ImagePaths, Option<ImageData>)>>
{
    // todo: configure?
    let file_reads = filenames.par_iter().map(|image_filename| {
        let load_result = read_file_with_rexif(original_root_path, &image_filename);
        return (image_filename.clone(), load_result);
    }).collect::<HashMap<_,_>>();
    return Ok(file_reads);
}

pub fn index_folder(original_root_path: &String, root_path: &String) -> anyhow::Result<HashMap<String, (ImagePaths, Option<ImageData>)>>
{
    // here our implementation is in-serial, build the collection of files we want to import
    // then load em, somewhat in parallel
    // this isn't strictly a smart way to do things ... but it's super simple to write as a quick way
    // to let your CPU speed this task up
    let eligible_files = gather_eligible_files(original_root_path, root_path)?;
    return load_images_in_parallel(original_root_path, &eligible_files)
}


pub fn make_image_data_from_exif(folder: Option<String>, filename: String, exif_fields: &Vec<ExifEntry>) -> image_data::ImageMetadataFields
{
    // let's also read xmp data in this function
    let mut f = XmpFile::new();
    let mut embedded_rating : Option<i16> = None;
    if f.is_ok()
    {
        let mut usable_f = f.unwrap();
        let fo_res =  usable_f.open_file(
            filename.clone(),
            OpenFileOptions::default().only_xmp()
        );
        if fo_res.is_err()
        {
            println!("Failed to open xmp for file {}", filename);
        }
        let xmp =  usable_f
            .xmp()
            .ok_or_else(|| anyhow::anyhow!("unable to process XMP in file {}", filename));
        if xmp.is_ok()
        {
            //for entry in xmp.unwrap().iter(IterOptions::default()) {
            //    println!("{} :: {} -> {}", entry.schema_ns, entry.name, entry.value.value)
            //}
            let xmp_map = xmp.unwrap();
            let rating_property = xmp_map
                .iter(IterOptions::default())
                .find(|entry| entry.schema_ns == "http://ns.adobe.com/xap/1.0/" && entry.name == "xmp:Rating");
            if rating_property.is_some()
            {
                embedded_rating = rating_property.unwrap().value.value.parse::<i16>().ok()
            }
    }
    }



    let datetime_original = get_string_from_tags(exif_fields, ExifTag::DateTimeOriginal);
    let model = get_string_from_tags(exif_fields, ExifTag::Model);
    let lens_model = get_string_from_tags(exif_fields, ExifTag::LensModel);
    // shutter_speed_value in the exif, is kinda awkward
    // https://photo.stackexchange.com/a/108823
    // Exposure time gives me the float I expect with no additional work.
    let shutter_speed_value = get_f64_from_tags(exif_fields, ExifTag::ExposureTime);
    let aperture_value = get_f64_from_tags(exif_fields, ExifTag::ApertureValue);
    let focal_length = get_f64_from_tags(exif_fields, ExifTag::FocalLength);
    let iso_speed_rating = get_u16_from_tags(exif_fields, ExifTag::ISOSpeedRatings);
    let exposure_program = get_u16_from_tags(exif_fields, ExifTag::ExposureProgram);
    let metering_mode = get_u16_from_tags(exif_fields, ExifTag::MeteringMode);
    let flash = get_u16_from_tags(exif_fields, ExifTag::Flash);
    // TODO: This is a bit silly, we've already gotten a value
    // but we're going to go back and regenerate it
    let mut shutter = None;
    if shutter_speed_value.is_some()
    {
        let entry_maybe = exif_fields.iter().find(|x| x.tag == ExifTag::ExposureTime);
        if entry_maybe.is_some()
        {
            let entry_val = entry_maybe.unwrap();
            let mut num = None;
            let mut den = None;
            match &(entry_val.value) {
                TagValue::URational(vec) => {
                    num = Some(vec.get(0).clone().unwrap().numerator);
                    den = Some(vec.get(0).clone().unwrap().denominator);
                },
                _ => ()
             };
            if num.is_some() && den.is_some()
            {
                shutter = Some( (num.unwrap(), den.unwrap()) );
            }
        }
    }
    return image_data::ImageMetadataFields {
        folder,
        filename,
        datetime_original,
        model,
        lens_model,
        shutter_speed_value: shutter,
        aperture_value,
        focal_length,
        iso_speed_rating,
        exposure_program,
        metering_mode,
        flash,
        embedded_rating
    };
}
