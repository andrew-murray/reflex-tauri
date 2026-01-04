'use client'

import React from 'react'
import { readFile } from '@tauri-apps/plugin-fs';
import Skeleton from '@mui/material/Skeleton';
// polyfill for toBase64
import "core-js/modules/esnext.uint8-array.to-base64.js";
import { invoke } from '@tauri-apps/api/core';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';

const getImageTypeFromImage = (image) => {
  if (!!image["adobe"])
  {
    return "adobe";
  }
  else if(!!image["exif"])
  {
    return "exif";
  }
  else
  {
    console.log({image});
    throw new Error("Unsupported image!");
  }
}

export default function AsyncImageFromApi({image, imageStyle, orientation, width, height, loadingVariant})
{
  const [imageState, setImageState] = React.useState(null);
  React.useEffect(
    () => {
      let mounted = true;
      let loadingError = false;
      const awaitable = async () => {
        let imageSrc = null;
        try
        {
          // note that if we don't have an image set, this will throw
          // and we'll get our LoadingError.jpg
          const contents = await invoke(
            "get_image_for_id",
            {
              // TODO: We should have an id here in the exif case, but it hasn't been populated
              imageId: image.id !== undefined ? image.id.toString() : "0",
              imageType: getImageTypeFromImage(image),
              imagePath: image["filename"],
              mode: "hi"
            }
          );
          const base64string = new Uint8Array(contents).toBase64();
          imageSrc = `data:image/jpg;base64,${base64string}`;
        }
        catch(error)
        {
          console.log({error});
          imageSrc = "/LoadingError.jpg";
          loadingError = true;
        }
        // todo: it's a better pattern to abort the request according to react sources
        // though ... this seems to catch more cases we care about
        if (mounted)
        {
          setImageState({image: imageSrc, error: loadingError});
        }
      };
      awaitable();
      return ()=>{ mounted=false; };
    },
    [image]
  );

  // TODO: It's not clear this is sufficient, I could set up a test-set?
  const oClassMap = {
    "AB": undefined,
    "BC": "rotate90"
  };
  // if we've had a loading error and are displaying the freepic image
  // force portrait orientation (similarly if we haven't loaded an image yet)
  const usingDefaultImage = (imageState === null || imageState.error === true);
  // note that the defaultImage is square so no need to rotate
  const oClass = usingDefaultImage ?  undefined : oClassMap[orientation];
  // this is a little awkward, could we read the dimensions from the image instead?
  const rotatedWidth = oClass === undefined ? width: height;
  const rotatedHeight = oClass === undefined ? height: width;

  const resolvedLoadingVariant = loadingVariant ?? "skeleton";

  return <React.Fragment>
    {imageState === null && (resolvedLoadingVariant === "skeleton") && <Skeleton variant="rectangular"
      width={rotatedWidth} 
      height={rotatedHeight} 
      style={imageStyle}
    /> }
    {imageState === null && (resolvedLoadingVariant === "spinner") && 
      <div style={Object.assign(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        imageStyle,
        {width: rotatedWidth, height: rotatedHeight}
      )}>
        <div>
          <CircularProgress color="secondary"/>
        </div>
      </div>
    }
    {imageState !== null && <img
      src={imageState.image}
      className={oClass}
      style={Object.assign(
        {},
        imageStyle,
        {
          width: rotatedWidth, 
          height: rotatedHeight
        }
      )}
    />}
  </React.Fragment>
}