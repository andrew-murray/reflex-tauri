import * as React from "react";
import Gallery from "./Gallery"
import {
  Page,
  Seo,
} from "gatsby-theme-portfolio-minimal";
import { Link } from 'gatsby';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { useMediaQuery } from 'gatsby-theme-portfolio-minimal/src/hooks/useMediaQuery';

import * as classes from './pagination.module.css';

const LeftOrRightButton = ({left, onClick, style, buttonStyle}) => {
  const allDivStyles = {
    backgroundColor: "transparent",
    borderColor: "transparent",
    cursor: "pointer",
    color: "var(--primary-color)"
  };
  const divStyles = !left ? Object.assign(allDivStyles,{rotate: "270deg"}, style) : Object.assign(allDivStyles, {rotate: "90deg"}, style);
  return (
    <>
      <button onClick={onClick} aria-label={left ? "previous" : "next"} style={divStyles}>
        <FontAwesomeIcon icon={faChevronDown}/>
      </button>
    </>
  );
};

const PaginationWidget = ({currentIndex, urls}) => {
  const isWide = useMediaQuery('(min-width: 1024px)');
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === urls.length - 1;
  const prevPage = isFirst ? "" : urls[currentIndex - 1];
  const nextPage = isLast ? "" : urls[currentIndex + 1];

  return (
    <nav className={classes.paginationNav}>
      <Link to={prevPage} key="prev" style={isFirst ? {visibility: "hidden"} : {} }>
        <LeftOrRightButton left />
      </Link>
      { isWide && 
        [...new Array(urls.length).keys()].map( (index) => {
          return <Link to={urls[index]} key={`page-index-${index}`} style={index === currentIndex ? {color: "var(--subtext-color)", cursor: "auto"} : {fontWeight: "700"}}> {index + 1} </Link>;
        })
      }
      {
        !isWide && <Link to={urls[currentIndex]} style={{cursor: "auto"}}> {currentIndex + 1} / {urls.length} </Link>
      }
      <Link to={nextPage} key="next" style={isLast ? {visibility: "hidden"} : {}}>
        <LeftOrRightButton left={false} />
      </Link>
    </nav>
  );
};

const GalleryFunc = ({data, location, title, urls, currentIndex}) => {
  const imageNodes = data.allFile.edges;
  const params = new URLSearchParams(location.search);
  // currentIndex is for the page, selected is for the image
  const selectedParam = params.get("selected");
  const selectedParsed = parseInt(selectedParam);
  const selectedIndex = isNaN(selectedParsed) ? -1 : selectedParsed;
  return (
    <>
      <Seo
        title={title}
        image={ selectedIndex !== - 1 ?  imageNodes[selectedIndex].node : undefined}
      />
      <Page useSplashScreenAnimation>
        <Gallery
            images={imageNodes}
            selected={selectedIndex}
        />
        {
          (currentIndex !== undefined && urls && urls.length > 1) && <PaginationWidget currentIndex={currentIndex} urls={urls} />
        }
      </Page>
    </>
  );
}

export default GalleryFunc;