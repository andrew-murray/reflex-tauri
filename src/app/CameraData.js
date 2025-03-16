const shutter = "com_adobe_shutterSpeedValue";
const aperture = "com_adobe_apertureValue";
const iso = "com_adobe_ISOSpeedRating";
const focalLength = "com_adobe_focalLength";

export const fields = {
  shutter,
  aperture,
  iso,
  focalLength
};

export const titles = {
  [shutter]: "Shutter Speed",
  [aperture]: "Aperture",
  [iso]: "ISO",
  [focalLength]: "Focal Length"
};

export const parsers = {
  [shutter]: (s) => {
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
  [aperture]: (s) => {
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
  [iso]: (s) => {
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
  [focalLength]: (s) => {
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
