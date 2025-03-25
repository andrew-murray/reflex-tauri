// FileUpload.react.js

// inspired by https://gist.github.com/AshikNesin/e44b1950f6a24cfcd85330ffc1713513
// and https://stackoverflow.com/questions/55830414/how-to-read-text-file-in-react

'use client'

import React from 'react'
import Button from '@mui/material/Button';
import { open } from '@tauri-apps/plugin-dialog';

export default function AsyncFileImport({onImport, onStartImport, accept, buttonProps})
{
  const onChange = async (e) => {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [{
        name: 'metadata.db',
        extensions: ['db']
      }]
    });
    if (selected === null)
    {
      return;
    }
    else
    {
      onImport(selected);
    }
  };

  return (
    <Button onClick={onChange} {...buttonProps}>Import File</Button>
 );
}