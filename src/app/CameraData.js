const adobe_shutter = "com_adobe_shutterSpeedValue";
const adobe_aperture = "com_adobe_apertureValue";
const adobe_iso = "com_adobe_ISOSpeedRating";
const adobe_focalLength = "com_adobe_focalLength";

const exif_shutter = "shutter_speed_value";
const exif_aperture = "aperture_value";
const exif_iso = "iso_speed_rating";

const exif_metering_mode = "metering_mode";
const exif_flash = "flash";
const exif_exposure_program = "exposure_program";


export const fields = {
  adobe_shutter,
  adobe_aperture,
  adobe_iso,
  adobe_focalLength
};

export const titles = {
  [adobe_shutter]: "Shutter Speed",
  [exif_shutter]: "Shutter Speed",
  [adobe_aperture]: "Aperture",
  [exif_aperture]: "Aperture",
  [adobe_iso]: "ISO",
  [exif_iso]: "ISO",
  [adobe_focalLength]: "Focal Length"
};

export const formatters = {
  [exif_metering_mode]: (s) => {
    const knownValues = new Map([
      [0, "Unknown"],
      [1, "Average"],
      [2, "Center-weight"],
      [3, "Spot"],
      [4, "Multi spot"],
      [5, "Pattern"],
      [6, "Partial"],
      [255, "Other"]
    ]);
    if (knownValues.has(s))
    {
      return knownValues.get(s);
    }
    else
    {
      // perhaps not the best choice, since this is also a value in the map
      return "Unknown";
    }
  },
  [exif_exposure_program]: (s) => {
    const knownValues = new Map([
      [0, "Not defined"],
      [1, "Manual"],
      [2, "Normal"],
      [3, "Aperture"],
      [4, "Shutter"],
      [5, "Creative"],
      [6, "Action"],
      [7, "Portrait"],
      [8, "Landscape"]
    ]);
    if (knownValues.has(s))
    {
      return knownValues.get(s);
    }
    else
    {
      // perhaps not the best choice, since this is also a value in the map
      return "Not defined";
    }
  }
};

export const parsers = {
  [adobe_shutter]: (s) => {
    // e.g. 1/30 sec
    const wsIndex = s.indexOf(' ');
    if (!(wsIndex === 0 || wsIndex === -1))
    {
      const slIndex = s.indexOf("/");
      if (slIndex !== -1)
      {
        const num = s.substring(0, slIndex);
        const denom = s.substring(slIndex + 1, wsIndex);
        return parseFloat(num) / parseFloat(denom);
      }
      else
      {
        return parseFloat(s.substring(0, wsIndex));
      }
    }
    else
    { 
      console.log("warning: received null/unexpected data");
      return null;
    }
  },
  [adobe_aperture]: (s) => {
    // e.g. "ƒ / 4.0"
    // lightroom uses some weird special "f" here!
    if (s.substring(0,4) === "ƒ / ")
    {
      return parseFloat(s.substring(4));
    }
    else
    { 
      console.log("warning: received null/unexpected data");
      return null;
    }
  },
  [adobe_iso]: (s) => {
    // e.g. "ISO 3200"
    if (s.substring(0,4) === "ISO ")
    {
      return parseFloat(s.substring(4))
    }
    else 
    {
      console.log("warning: received null/unexpected data");
      return null;
    }
  },
  [adobe_focalLength]: (s) => {
    // e.g. "40 mm"
    const wsIndex = s.indexOf(' ');
    if (wsIndex === -1)
    {
      console.log("warning: received null/unexpected data");
      console.log(s)
      return null;
    }
    else
    {
      return parseInt(s.substring(0, wsIndex));
    }
  }
};

export const ConversionKeys = {
  "filename": "com_adobe_absoluteFilepath",
  "folder": "com_adobe_folder",
  "datetime_original": "com_adobe_dateTime",
  "model": "com_adobe_model",
  "lens_model":"com_adobe_lens",
  "shutter_speed_value": "com_adobe_shutterSpeedValue",
  "aperture_value": "com_adobe_apertureValue",
  "focal_length": "com_adobe_focalLength",
  "iso_speed_rating": "com_adobe_ISOSpeedRating",
  "exposure_program": "com_adobe_exposureProgram",
  "metering_mode": "com_adobe_meteringMode",
  "flash": "com_adobe_flash",
  "Raw Dims": "com_adobe_imageFileDimensions",
  "Crop Dims":"com_adobe_imageCroppedDimensions"
};

const defaultParser = (s) => {return s;};
export const Conversion = Object.fromEntries(
  Object.entries(ConversionKeys).map( 
    kv => [
      kv[0], 
      (kv[1] in parsers ? (image) => { return parsers[kv[1]](image[kv[1]]); } 
        : (image) => { return defaultParser(image[kv[1]]); })
    ]
  )
);