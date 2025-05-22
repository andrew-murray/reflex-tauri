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
};

export const exif_parsers = {
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
      return null;
    }
    else
    {
      return parseInt(s.substring(0, wsIndex));
    }
  }
};

export const makeImageFromExif = (record) => {
  // it seems a little more reliable to translate our enums to strings
  // rather than the adobe strings to enums
  return Object.assign(
    {},
    record,
    {
      exposure_program: exif_parsers["exposure_program"](record["exposure_program"]),
      metering_mode: exif_parsers["metering_mode"](record["metering_mode"]),
      // we don't include rating, so that the graph knows to drop this column
      // rating: null,
      exif: record,
      adobe: null
    }
  );
};

export const makeImageFromLightroom = (record) => {
  // various fields can be copied like for like
  // but not all!
  const image = {
    filename: record["com_adobe_absoluteFilepath"],
    folder: record["com_adobe_folder"],
    model: record["com_adobe_model"],
    lens_model: record["com_adobe_lens"],

    datetime_original: record["com_adobe_dateTime"],

    focal_length: parsers[adobe_focalLength](record[adobe_focalLength]),
    shutter_speed_value: parsers[adobe_shutter](record[adobe_shutter]),
    aperture_value: parsers[adobe_aperture](record[adobe_aperture]),
    iso_speed_rating: parsers[adobe_iso](record[adobe_iso]),

    exposure_program: record["com_adobe_exposureProgram"],
    metering_mode: record["com_adobe_meteringMode"],
    // flash: record["com_adobe_flash"]

    rating: record["com_adobe_rating"],

    exif: null,
    adobe: record
  };
  return image;
};