const adobe_shutter = "com_adobe_shutterSpeedValue";
const adobe_aperture = "com_adobe_apertureValue";
const adobe_iso = "com_adobe_ISOSpeedRating";
const adobe_focalLength = "com_adobe_focalLength";

const exif_shutter = "shutter_speed_value";
const exif_aperture = "aperture_value";
const exif_iso = "iso_speed_rating";

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
