'use client'

import React from 'react'
import { readFile } from '@tauri-apps/plugin-fs';
import Skeleton from '@mui/material/Skeleton';
// polyfill for toBase64
import "core-js/modules/esnext.uint8-array.to-base64.js";
import { invoke } from '@tauri-apps/api/core';

export default function AsyncImageFromApi({image, imageStyle, orientation, width, height})
{
  const [imgState, setImageState] = React.useState(null);
  React.useEffect(
    () => {
      let mounted = true;
      const awaitable = async () => {
        let imageSrc = null;
        try
        {

          const contents = await invoke(
            "get_image_for_id",
            {
              imageId: image.imageid.toString(),
              mode: "lo"
            }
          );
          const base64string = new Uint8Array(contents).toBase64();
          imageSrc = `data:image/jpg;base64,${base64string}`;
        }
        catch(error)
        {
          console.log({error});
          imageSrc = "/plzno-freepik.jpg";
        }
        // todo: it's a better pattern to abort the request according to react sources
        // though ... this seems to catch more cases we care about
        if (mounted)
        {
          setImageState(imageSrc);
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
  const oClass = oClassMap[orientation];

  return <React.Fragment>
    {imgState === null && <Skeleton variant="rectangular" width={width} height={height} /> }
    {imgState != null && <img
      src={imgState}
      className={oClass}
      style={Object.assign(
        {},
        imageStyle,
        {width, height}
      )}
    />}
  </React.Fragment>
}