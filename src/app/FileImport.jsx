// FileUpload.react.js

// inspired by https://gist.github.com/AshikNesin/e44b1950f6a24cfcd85330ffc1713513
// and https://stackoverflow.com/questions/55830414/how-to-read-text-file-in-react

'use client'

import React from 'react'
import Button from '@mui/material/Button';


export default function FileImport({onImport, onStartImport, accept, buttonProps})
{
  const hiddenFileInputRef = React.useRef(null);
  // TODO: use React.useCallback/useMemo
  const onChange = (e) => {
    if (onStartImport) {
      onStartImport();
    }
    for (const fileObject of e.target.files)
    {
      const reader = new FileReader()
      reader.onload = loadEvent => {
        if( onImport )
        {
          onImport(
            { file: fileObject, content : loadEvent.target.result}
          );
        }
      };
      reader.readAsArrayBuffer(fileObject);
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