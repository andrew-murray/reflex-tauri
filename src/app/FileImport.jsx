// FileUpload.react.js

// inspired by https://gist.github.com/AshikNesin/e44b1950f6a24cfcd85330ffc1713513
// and https://stackoverflow.com/questions/55830414/how-to-read-text-file-in-react

'use client'

import React from 'react'
import Button from '@mui/material/Button';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

// FIXME: This needs to migrate to tauri
// there's a dialog that would support this
// https://v1.tauri.app/v1/api/js/dialog/#open

export default function FileImport({onImport, onStartImport, accept, buttonProps})
{
  const hiddenFileInputRef = React.useRef(null);
  const onChange = async (e) => {
    if (onStartImport) {
      onStartImport();
    }
    for (const fileObject of e.target.files)
    {
      // the fileObject only has local-context so we can't use it with readFile
      // I don't think
      const blob = await readFile(
        "C:/lightroom catalogs/main - 2024/LOCAL_COPY/main-v13/main-v13 Helper.lrdata/metadatahelper.db"
      );
      if(onImport)
      {
        onImport(
        {
          file: fileObject, content: blob
        });
      }
    }
  };

  const clickFile = (e) => {
    hiddenFileInputRef.current.click();
  };

  return (
    <React.Fragment>
      <Button onClick={clickFile} {...buttonProps}>Import File</Button>
      <input
        type="file"
        hidden
        accept={accept}
        onChange={(e) => onChange(e)} ref={hiddenFileInputRef}
      />
    </React.Fragment>
 )
}