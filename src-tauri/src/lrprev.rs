use image::codecs::jpeg::JpegDecoder;
use image::DynamicImage;
use std::fs;
use std::io::Cursor;

fn find_subsequence<T>(container: &[T], search_term: &[T]) -> Option<usize>
where
    for<'a> &'a [T]: PartialEq,
{
    // pinched from https://stackoverflow.com/questions/35901547/how-can-i-find-a-subsequence-in-a-u8-slice
    container
        .windows(search_term.len())
        .position(|window| window == search_term)
}

// todo: this should return Result<DynamicImage, err> with a custom error type
fn jpeg_from_bytes(bytes: &[u8], output_jpeg: bool) -> Option<DynamicImage> {
    let buff = Cursor::new(bytes);
    let decoder = JpegDecoder::new(buff);
    if !decoder.is_ok() {
        return None;
    }
    let image = DynamicImage::from_decoder(decoder.unwrap());
    if !image.is_ok() {
        return None;
    }
    let final_image = image.unwrap();
    if output_jpeg {
        // todo: don't ignore
        let _ = final_image.save("my.jpeg");
    }
    return Some(final_image);
}

pub fn get_jpeg_byte_segments_from_file(
    name: &str,
) -> Result<Vec<Vec<u8>>, Box<dyn std::error::Error>> {
    let data: Vec<u8> = fs::read(name)?;
    let mut recorded_starts: Vec<usize> = Vec::new();
    for i in 1..10 {
        let level_s = format!("level_{i}");
        let level_s_as_bytes = level_s.as_bytes().to_owned();
        let last_start = recorded_starts.last().unwrap_or(&(0usize)).to_owned();
        let found_search_term = find_subsequence(&data[last_start..], &level_s_as_bytes);
        if found_search_term.is_some() {
            let jpeg_start = last_start + found_search_term.unwrap() + level_s_as_bytes.len() + 1;
            recorded_starts.push(jpeg_start);
        } else {
            break;
        }
    }
    let bytes_sequences = (0..recorded_starts.len())
        .map(|range_index| {
            if range_index != recorded_starts.len() - 1 {
                return data[recorded_starts[range_index]..recorded_starts[range_index + 1]]
                    .to_vec();
            } else {
                return data[recorded_starts[range_index]..].to_vec();
            }
        })
        .collect();
    return Ok(bytes_sequences);
}

pub fn get_jpegs_from_file(name: &str) -> Result<Vec<DynamicImage>, Box<dyn std::error::Error>> {
    let byte_sequence_result = get_jpeg_byte_segments_from_file(name);
    if byte_sequence_result.is_err() {
        return Err(byte_sequence_result.err().unwrap());
    }
    let byte_sequences = byte_sequence_result.unwrap();
    let jpegs: Vec<Option<DynamicImage>> = byte_sequences
        .into_iter()
        .map(|s| jpeg_from_bytes(&s, false))
        .collect();
    let valid_jpegs = jpegs
        .into_iter()
        .filter_map(|jpeg| jpeg)
        .collect::<Vec<DynamicImage>>();
    return Ok(valid_jpegs);
}
