'use client'

import React from 'react'
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ClearIcon from '@mui/icons-material/Clear';
import AsyncImageFromApi from "./AsyncImageFromApi";

export default function TempLightboxDialog({images, activeImageIndex, setActiveImage, onClose}) {
  // Get the 0th element assuming this to be unique if-it-exists and undefined otherwise
  // the filepath may not be a useful title, so don't have one for now
  // const title = 
  return <Dialog
    open={true}
    onClose={onClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="graph-dialog-title">
      <IconButton
        onClick={onClose}
      >
        <ClearIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent style={{width: 800, height: 800, padding: 10}}>
      <AsyncImageFromApi
        image={images[activeImageIndex]}
        width={"100%"}
        height={"100%"}
      />
    </DialogContent>
  </Dialog>
};