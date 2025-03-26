'use client'

import React from 'react'
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ClearIcon from '@mui/icons-material/Clear';
import AsyncImageFromApi from "./AsyncImageFromApi";
import {
  Lightbox, 
  createIcon,
  useLightboxState
} from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

export default function TempLightboxDialog({images, activeImageIndex, orientation, setActiveImage, onClose}) {
  // Get the 0th element assuming this to be unique if-it-exists and undefined otherwise
  // the filepath may not be a useful title, so don't have one for now
  // const title = 
  return <Lightbox
    index={activeImageIndex}
    open={activeImageIndex >= 0}
    slides={images.map(im => Object.assign({}, im, {type: "custom-slide"}))}
    render={{
      slide: ({slide, rect}) => {
        return slide.type === "custom-slide" ? (
          <AsyncImageFromApi
            image={slide}
            orientation={orientation}
            width={rect.width}
            height={rect.height}
            imageStyle={{objectFit: "contain"}}
          />
        ) : undefined;
      }
    }}
    close={onClose}
    toolbar={{
      buttons: [
        "slideshow",
        "close"
      ]
    }}
    // plugins={[Captions, Fullscreen, Slideshow, Thumbnails]}
    plugins={[Slideshow]}
  />
};