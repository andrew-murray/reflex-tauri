'use client'

import React from 'react'
import { readFile } from '@tauri-apps/plugin-fs';
import Skeleton from '@mui/material/Skeleton';
// polyfill for toBase64
import "core-js/modules/esnext.uint8-array.to-base64.js";

// FIXME: This needs to migrate to tauri
// there's a dialog that would support this
// https://v1.tauri.app/v1/api/js/dialog/#open

export default function AsyncImageFromFile({src, imageStyle, width, height})
{
  const [imgState, setImageState] = React.useState(null);
  React.useEffect(
    () => {
      let mounted = true;
      const awaitable = async () => {
        const contents = await readFile(src);
        const base64string = contents.toBase64();
        // todo: it's a better pattern to abort the request according to react sources
        // though ... this seems to catch more cases we care about
        if (mounted)
        {
          setImageState(`data:image/jpg;base64,${base64string}`);
        }
      };
      awaitable();
      return ()=>{ mounted=false; };
    },
    [src]
  );

  return <React.Fragment>
    {imgState === null && <Skeleton variant="rectangular" width={width} height={height} /> }
    {imgState != null && <img
      src={imgState}
      style={Object.assign(
        {},
        imageStyle,
        {width, height}
      )}
    />}
  </React.Fragment>
}