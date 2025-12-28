import * as React from "react";

import PhotoAlbum from "react-photo-album";
import {GatsbyImage, getSrc, getSrcSet} from 'gatsby-plugin-image'

import styled from 'styled-components'

import {
  Lightbox, 
  IconButton,
  createIcon,
  useLightboxState
} from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
// import Share from "yet-another-react-lightbox/plugins/share";
import "yet-another-react-lightbox/styles.css";

import Mobile from "./Mobile"
import SharingDialog from "./SharingDialog"

/*
  ImageWrapper and GastbyImageInterop are based on a github gist.
  (i) I have a feeling they might accidentally ditch some properties that should be passed on. 
  (ii) I'm not yet convinced that srcSet/width/height are wired up properly to ensure that low-res images are fetched first.

  However, let's include some references to how someone else did it
  https://www.reddit.com/r/gatsbyjs/comments/ioytxs/help_reactphotogallery_with_gatsby_image_img/
  https://gist.github.com/JordanHood/f36891bc33b6a7347ebab988a018429d
  https://woolpackiwade.co.uk/Gallery  
*/
const ImageWrapper = styled.div`
  box-shadow: -1px 3px 6px 1px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease-in-out;
  border-radius: 2px;
  overflow: hidden;
  cursor: zoom-in;
  div {
    transition: transform 1.5s;
  }
  &:hover {
    box-shadow: -2px 5px 8px 2px rgba(0, 0, 0, 0.3);
    div {
      transform: scale(1.05);
    }
  }
  padding: ${props => props.padding};
  width: ${props => props.width}px;
  height: ${props => props.height}px;
  margin-bottom: ${props => props.mb};
  display: ${props => props.display};
`;

const GatsbyImageInterop = ({ photo, layout, layoutOptions, ...restImageProps }) => {
  const onClick = layoutOptions.onClick;
  // we handle various of these options on the wrapper, rather than on the image
  const {cursor: removeCursorOption, padding, marginBottom, ...imageStyle} = restImageProps.imageProps.style;

  // this code is somewhat suspect, note that clearly react-photo-album passes a lot of options
  // and we ignore a lot of them
  // in particular managing the wrapper/image styling has already proven fiddly in the past

  const {wrapperStyle} = restImageProps;
  // react-photo-album's layouts all end up looking odd if you put ridiculous padding on your objects
  // but ... I think it's garbage-in-garbage-out
  // but regardless, the below options ensure the best behaviour in those scenarios
  const fitImageToAvailableSize = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    margin: "auto"
  };
  return (
    <ImageWrapper
      padding={padding}
      mb={wrapperStyle.marginBottom}
      display={wrapperStyle.display}
      onClick={(e) => onClick(e, { index: layout.index, photo })}
      width={layout.width}
      height={layout.height}
    >
      <GatsbyImage
        alt=""
        image={photo.gatsbyImageData}
        width={layout.width}
        height={layout.height}
        objectFit="contain"
        style={Object.assign(imageStyle, fitImageToAvailableSize)}
        className={restImageProps.imageProps.className}
      />
    </ImageWrapper>
  );
};

const shuffleArray = (unshuffled) => {
  return unshuffled
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

const getImages = imageArray => {
  return [...imageArray]
    // .sort((a, b)  ??
    .map(({ node: { childImageSharp: { original, gatsbyImageData } } }) => ({
      height: original.height,
      width: original.width,
      src: getSrc(gatsbyImageData),
      // srcSet: fluid.srcSet, srcSet doesn't wire up correctly
      // hopefully passing the gatsbyImageData to the gatsby image is sufficient
      gatsbyImageData
    }))
}

/*
  the following functions are pulled from the yet-another-react-lightbox default implementation because the SharePlugin
  (a) won't render if the browser doesn't support sharing, even if you give it a custom sharing function
  (b) it's convenient to use the default implementation when we're in a scenario where it'd work
  I should probably be trying to import them...
*/
const isShareSupported = () => {
  return typeof navigator !== "undefined" && Boolean(navigator.canShare);
}

const isImageSlide = (slide) => {
  return slide.type === undefined || slide.type === "image";
}

const shareDetailsFromSlide = (currentSlide) => {
  const share =
  (currentSlide &&
    ((typeof currentSlide.share === "object" && currentSlide.share) ||
      (typeof currentSlide.share === "string" && { url: currentSlide.share }) ||
      (isImageSlide(currentSlide) && { url: currentSlide.src }))) ||
    undefined;
  return share;
}

const defaultShare = (slide) => {
  const shareDetails = shareDetailsFromSlide(slide);
  if (shareDetails)
  {
    // TODO: log failures?
    navigator.share(shareDetails).catch(() => {});
  }
}

const ShareIcon = createIcon(
  "ShareIcon",
  <path d="m16 5-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />,
);

const ShareButton = ({share}) => {
  const { currentSlide } = useLightboxState();
  return (
    <IconButton
      label="Share"
      icon={ShareIcon}
      disabled={!currentSlide}
      onClick={()=>share({slide: currentSlide})}
    />
  );
}

const getSrcSetDetails = (image) =>
{
  // YARLightbox wants srcSet in a very specific format, rather than as a string
  // (which it will later convert back to a string)
  // this recovers that metadata the format that gatsbyImage has already created
  const srcSet = getSrcSet(image);
  const imageHeightProportion = image.gatsbyImageData.height;
  // imageParts [ [src_url, "180w"] ];
  const imageParts = srcSet.split(",\n").map( x => x.split(" "));
  let specifiedSrcSet = imageParts.map( 
    d => {
      const widthPixels = parseInt(d[1].substring(0, d[1].length-1));
      const heightPixels = imageHeightProportion * widthPixels;
      return {
        src: d[0],
        width: widthPixels,
        height: heightPixels
      };
    }
  );
  const src = getSrc(image);
  if( specifiedSrcSet.find( imData => imData.src === src) === undefined )
  {
    const srcData = {
      src: src,
      width: image.width,
      height: image.height
    };
    specifiedSrcSet.push( srcData );
  }
  return specifiedSrcSet;
};

const Gallery = ({images, plugins, layout, selected}) => {
  const photos = getImages(images);
  const [shareModalState, setShareModalState] = React.useState(null);
  const [shuffle,] = React.useState(shuffleArray([...Array(photos.length).keys()]));
  const [index, setIndex] = React.useState(selected ?? -1);
  const onClick = (e, photoDetails) => {
    const trueIndex = shuffle[photoDetails.index];
    setIndex(trueIndex);
    window.history.replaceState({}, document.title, window.location.pathname + `?selected=${trueIndex}`);
  };

  const baseURL = window.location.protocol + "//" + window.location.host  + window.location.pathname;
  // TODO: selected=index is not stable under website updates
  // adopt a partial url based approach? Hoping that is?

  const slides = shuffle.map( ix => {
    return Object.assign(
      {},
      photos[ix],
      {
        share: {
          title: `Image ${ix} from Gallery`,
          url: baseURL + `?selected=${ix}`
        },
        srcSet: getSrcSetDetails(photos[ix])
      }
    );
  });
  const shareFunction = ({slide}) => 
  {
    // chrome supports the share API, but I hate the windows integration
    // perhaps I'm giving rubbish functionality to the macOS/linux people here, sorry!
    if (Mobile() && isShareSupported())
    { 
      defaultShare(slide);
    }
    else 
    {
      // firefox on desktop doesn't support this API ... 
      // chrome does but it'll send it to the windows implementation which is horrible
      // just reimplement a simple one
      setShareModalState(slide.share);
    }
  };
  const columns = Mobile() ? 2 : undefined;
  return (
    <>
      {shareModalState !== null && 
        <SharingDialog
          open={shareModalState !== null}
          close={()=>{setShareModalState(null);}}
          url={shareModalState.url}
          title={shareModalState.title}
        />
      }
      <Lightbox
        index={index !== -1 ? shuffle.indexOf(index) : -1}
        slides={slides}
        open={index >= 0}
        close={() => {
          setIndex(-1)
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
        toolbar={{
          buttons: [
            <ShareButton share={shareFunction} key="share"/>,
            "slideshow",
            "close"
          ]
        }}
        share={{
          share: shareFunction
        }}
        plugins={plugins ?? [Slideshow]}
        styles={{
          slide: {
            pointerEvents: "none"
          }
        }}
      />
      <PhotoAlbum
        layout={layout ?? "columns"}
        columns={columns}
        photos={slides}
        renderPhoto={GatsbyImageInterop}
        onClick={onClick}
      /> 
    </>
  );
};

export default Gallery;