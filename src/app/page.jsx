'use client'

import AsyncFileImport from "./AsyncFileImport"
import React from 'react'
import DataTable from "./DataTable"
import GraphPanel from "./GraphPanel"
import NavDrawer from "./NavDrawer"
import WaitingMessage from "./WaitingMessage"
import GraphDialog from "./GraphDialog"
import CssBaseline from '@mui/material/CssBaseline';
import { styled } from '@mui/material/styles';
import {
    Box
} from "@mui/material";
import {pathsep} from "./defs"
import {metadata} from "./LightroomDB"
import useScript from "./useScript"

const MainMinusDrawer = styled(
  'main', 
  { shouldForwardProp: (prop) => prop !== 'open' })(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
     transition: theme.transitions.create('margin', {
       easing: theme.transitions.easing.sharp,
       duration: theme.transitions.duration.leavingScreen,
     })
  })
);

function computeFolderAndFilesystemPathsFromImages(images)
{
  let folders = new Set();
  // I'm going to assume that people treat their filesystem relatively homogeneously 
  // so these things aren't going to be too deep
  // todo: regardless it might still be worth building a better representation of the tree?
  let filesystemLevels = {};
  let count = 0;
  for (const image of images)
  {
    // TODO: where to handle null
    folders.add(image["com_adobe_folder"]);
    const filepath = image["com_adobe_absoluteFilepath"];
    const paths = filepath.split(pathsep);
     // remove filename 
    const realFolders = paths.slice(0, paths.length - 1);
    for(const index of [...Array(realFolders.length).keys()])
    {
      const currentFullDir = realFolders.slice(0, index + 1).join(pathsep);
      // it's very possible we should bother building 
      if(filesystemLevels[index] === undefined)
      {
        filesystemLevels[index] = new Set();
      }
      filesystemLevels[index].add(currentFullDir);
    }
  }
  // turn each filesystemLevel into a sorted list instead
  for(let k of Object.keys(filesystemLevels))
  {
    let valueList = [...filesystemLevels[k]];
    valueList.sort();
    filesystemLevels[k] = valueList;
  }
  // cache the tree structure, so that
  // {"D:/photos" : ["path_in_dphotos_1", "path_in_d_photos_2"]}
  // means precisely two directories exist in d:/photos and they are
  // "D:/photos/path_in_dphotos_1", "d:/photos/path_in_d_photos_2"
  let filesystemQueryCache = {};
  for(let k of Object.keys(filesystemLevels))
  {
    const nextK = (parseInt(k) + 1).toString();
    const nextLayer = filesystemLevels[nextK];
    for (const pathInCurrentLayer of filesystemLevels[k])
    {
      let filteredNextLayer = [];
      if(nextLayer !== undefined)
      {
        // store leafPaths, for whatever's underneath each key
        filteredNextLayer = nextLayer.filter(
          path => path.startsWith(pathInCurrentLayer + pathsep)
        ).map(
          path => path.substring(pathInCurrentLayer.length + 1) 
        );
      }
      filesystemQueryCache[pathInCurrentLayer] = filteredNextLayer;
    }
  }
  return {
    filesystem: filesystemLevels,
    filesystemQueryCache,
    folders
  };
}

function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  const out = [...arr];
  if (index > -1) {
    out.splice(index, 1);
  }
  return out;
}

// https://coolors.co/palette/8ecae6-219ebc-023047-ffb703-fb8500
const ColorPalette = [
  "#8ECAE6",
  "#219EBC",
  "#023047",
  "#FFB703",
  "#FB8500"
];

const arrayEqual = (a, b) => {
  if( a === b )
  {
    return true;
  } 
  if( (a === undefined) ^ (b === undefined) )
  {
    return false;
  }
  return a.length === b.length &&
    a.every((e,i) => e === b[i]);
};

const isNoLessFiltered = (filters, prevFilters) => {
  // was include everything
  if( prevFilters === undefined )
  {
    return true;
  } 
  // was *not* include everything, but now is
  if (filters === undefined)
  {
    return false;
  }
  const filterSet = new Set(filters);
  const prevFilterSet = new Set(prevFilters);
  return prevFilterSet.isSubsetOf(filterSet);
};

export default function Home() {
  const [db,setDB] = React.useState(null);
  const [SQL, setSQL] = React.useState(null);
  const [inProgress, setInProgress] = React.useState(false);
  const [images, setImages] = React.useState([]);
  const [filteredImageState, setFilteredImageState] = React.useState({
    prevImages: [],
    prevFolderFilters: [],
    prevFilesystemFilters: [],
    prevFiltersByMetric: {},
    filteredImages: []
  });
  const [navOpen, setNavOpen] = React.useState(true);
  const [folderFilters, setFolderFilters] = React.useState([]);
  const [filesystemFilters, setFilesystemFilters] = React.useState([]);
  const [filtersByMetric, setFiltersByMetric] = React.useState({});
  const [metricsToPlot, setMetricsToPlot] = React.useState([]);

  const [logMode, setLogMode] = React.useState(false);
  const [ratingsToGraph, setRatingsToGraph] = React.useState(null);

  const handleFileStartImport = () => {
      setInProgress(true);
  };

  const folderData = React.useMemo( ()=> {
      return computeFolderAndFilesystemPathsFromImages(images);
    },
    [images]
  );

  const onLoadCallback = React.useCallback(
    () => {
      console.log("hit onLoad callback!!");
      initSqlJs({}).then( sq => {
        setSQL(sq)
      })
      .catch(err => console.log("caught err while loading sql" + err.toString()))
    },
    [setSQL]
  );

  useScript({
    src: "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js",
    onLoad: onLoadCallback,
    async: true
  });

  const handleFileImport = (e) => {
    if(SQL)
    {
      const byte_buffer = e.content; // new Uint8Array(e.content);
      const localDB = new SQL.Database(byte_buffer);
      setDB(localDB);
      window.sql = SQL;
      window.db = localDB;
      // TODO: if I'm going to pull the data across in chunks,
      // perhaps I should cache computation in chunks as well?
      const maxLimit = 50000;
      const chunkLength = 5000;
      for (let currentTotal = 0; currentTotal < maxLimit; currentTotal += chunkLength)
      {
        const metadataChunk = metadata.queries.select.images(localDB, chunkLength, currentTotal);
        setImages( prevImages => prevImages.concat(metadataChunk));
        if(metadataChunk.length < chunkLength)
        {
          break;
        }
      }
      setInProgress(false);
    }
    else
    {
      console.log("SQL not available");
    }
  }
  const handleDrawerClose = React.useCallback( 
    ()=> {
      setNavOpen(false);
    },
    []
  );
  const handleDrawerOpen = React.useCallback( 
    ()=> {
      setNavOpen(true);
    },
    []
  );
  const onFilterFolder = React.useCallback( 
    (event, ids)=> {
      setFolderFilters(ids);
    },
    []
  );
  const onFilterFilesystem = React.useCallback( 
    (event, id)=> {
      setFilesystemFilters([id]);
    },
    []
  );

  const onSetFiltersForMetric = React.useCallback(
    (metricKey, filters) => {
      setFiltersByMetric(
        prevFiltersByMetric => {
          // create a new object, always assign into it
          let out = Object.assign(
            {},
            prevFiltersByMetric,
            {
              [metricKey]: filters
            }
          )
          // if we've been asked to set to "undefined"
          // remove the key
          if(filters === undefined && metricKey in out)
          {
            delete out[metricKey];
          }
          return out;
        }
      );
    },
    []
  );

  const filteredImages = React.useEffect(
    ()=>{
      // todo: maybe we should capture the state of things at the start,
      // of this effect
      // so that we can abandon our computation as necessary?
      if (folderFilters.length === 0 && filesystemFilters.length === 0 && Object.keys(filtersByMetric).length === 0)
      {
        // TODO: figure out how this is threaded, with relation to the inputs
        setFilteredImageState({
          prevImages: images,
          prevFolderFilters: folderFilters,
          prevFilesystemFilters: filesystemFilters,
          prevFiltersByMetric: filtersByMetric,
          filteredImages: images
        });
        return;
      }

      const imagesAreEqual = filteredImageState.prevImages === images;
      const noFolderFilters = folderFilters.length === 0;
      const noFilesystemFilters = filesystemFilters.length === 0;
      const noMetricFilters = Object.keys(filtersByMetric).length === 0;
      if (imagesAreEqual)
      {
        // various accelerations to try and reuse the previous filtering result TODO: UNUSED!
        const folderIsNoLessFiltered = filteredImageState.prevFolderFilters.length === 0 ||
          folderFilters.length !== 0 && new Set(folderFilters).isSubsetOf(new Set(filteredImageState.prevFolderFilters));
        const folderIsEqual = folderIsNoLessFiltered && filteredImageState.prevFolderFilters.length === folderFilters.length;
        // slightly different checks, because our filesystem is a tree!
        // are all our new filesystem filters, within our old filter?
        const filesystemIsNoLessFiltered = filteredImageState.prevFilesystemFilters.length === 0 
          || filesystemFilters.length !== 0 && filesystemFilters.every( currentFilter => filteredImageState.prevFilesystemFilters.some( 
              prevFilter => currentFilter.startsWith(prevFilter)
          ));
        const filesystemIsEqual = filteredImageState.filesystemFilters === filesystemFilters;
        const allMetricsEqual = filtersByMetric === filteredImageState.prevFiltersByMetric;
        console.log( {filtersByMetric, filteredImageState })
        const unionKeys = Array.from(
          new Set(Object.keys(filtersByMetric)).union(new Set(Object.keys(filteredImageState.prevFiltersByMetric)))
        );
        // for allMetricsEqual we check the same object, but now we care about value equal
        const metricIsEqual = Object.fromEntries(
            unionKeys.map(k => [k, arrayEqual(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])])
          );
        const metricIsNoLessFiltered = Object.fromEntries(
            unionKeys.map(k => [k, isNoLessFiltered(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])])
          );
        const noLessFiltered = (
          folderIsNoLessFiltered
          && filesystemIsNoLessFiltered
          && Object.values( metricIsNoLessFiltered ).every( b => b )
        );
        // skipFolderFiltering if there's no criteria to pass - or we're filtering from a set that's already passed our condition
        const skipFolderFiltering = noFolderFilters || ( noLessFiltered && folderIsEqual);
        // skipFilesystemFiltering if there's no criteria to pass - or we're filtering from a set that's already passed our condition
        const skipFilesystemFiltering = noFilesystemFilters || ( noLessFiltered && filesystemIsEqual);
        const skipMetricFiltering = noMetricFilters || (noLessFiltered && allMetricsEqual);
        const filterFunc = (image, index) => {
          const folderPass = skipFolderFiltering || folderFilters.includes(image["com_adobe_folder"]);
          const filesystemPass = skipFilesystemFiltering || filesystemFilters.some(
            fFilter => image["com_adobe_absoluteFilepath"].startsWith(fFilter)
          );
          let passMetricFilters = true;
          if(!skipMetricFiltering)
          {
            // todo: we could do smarter per-metric skipping
            for(const [metric, values] of Object.entries(filtersByMetric))
            {
              passMetricFilters &= values.includes(image[metric]);
            }
          }
          return filesystemPass && folderPass && passMetricFilters;
        }
        const imageBase = noLessFiltered ? filteredImageState.filteredImages : images;
        const filteredImages = imageBase.filter(filterFunc);
        setFilteredImageState({
          prevImages: images,
          prevFolderFilters: folderFilters,
          prevFilesystemFilters: filesystemFilters,
          prevFiltersByMetric: filtersByMetric,
          filteredImages: filteredImages
        });
      }
      else
      {
        // TODO: Compute a "common-base-path" and use it to skip comparison, 
        // if filesystemFilters includes it
        const filteredImages = images.filter(
          (image, index) => {
            const folderPass =  noFolderFilters || folderFilters.includes(image["com_adobe_folder"]);
            const filesystemPass = noFilesystemFilters || filesystemFilters.some(
              fFilter => image["com_adobe_absoluteFilepath"].startsWith(fFilter)
            );
            let passMetricFilters = true;
            if (!noMetricFilters)
            {
              for(const [metric, values] of Object.entries(filtersByMetric))
              {
                passMetricFilters &= values.includes(image[metric]);
              }
            }
            return filesystemPass && folderPass && passMetricFilters;
          }
        );
        setFilteredImageState({
          prevImages: images,
          prevFolderFilters: folderFilters,
          prevFilesystemFilters: filesystemFilters,
          prevFiltersByMetric: filtersByMetric,
          filteredImages: filteredImages
        });
      }
      return () => {};
    },
    [images, folderFilters, filesystemFilters, filtersByMetric]
  );

  // we use this to force stateful components to reset state
  // (primarily the pageCount, in the table)
  // Note that since adding a filter might have no effect (filtering all files by "startsWith("c:/")"
  // we currently make the design choice to just treat the length as the uniqueness marker, to avoid
  // destroying components (resetting selected-page) as the user-clicks through the filesystem hierarchy
  
  // This seems to have the behaviour most in-tune with what users might want, though it might fall down if 
  // some single operation can "add a new filter and remove an old one, resulting in a change that has length=n, but a different set of images"
  // That's possibly not a "bug"/ "surprising" as far as the users concerned? Even though it is a failure in the UI to have well-defined-predictable behaviour.
  const uniqueDataKey = React.useMemo(
    ()=>{
      const imagesKey = `filtered-images-${filteredImageState.filteredImages.length}`;
      // const folderJoin = folderFilters.join(",");
      // const folderFilterString = `folders=[${folderJoin}]`
      // const fsJoin = filesystemFilters.join(",");
      // const fsFilterString = `fs=[${fsJoin}]`
      return imagesKey;
    },
    // [images, folderFilters, filesystemFilters]
    [filteredImageState]
  );

  const selectMetric = React.useCallback((metric) => {
    setMetricsToPlot([metric]);
  });
  // FIXME: What should we render if we've filtered all the images out?

  return (<React.Fragment>        
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {(images.length !== 0 && !inProgress) && 
          <NavDrawer 
            open={navOpen}
            onSelectFolders={onFilterFolder}
            onSelectFilesystem={onFilterFilesystem}
            selectedFolders={folderFilters}
            selectedFilesystem={filesystemFilters}
            folderData={folderData}
            handleDrawerClose={handleDrawerClose}
            handleDrawerOpen={handleDrawerOpen}
          />
        }
        <MainMinusDrawer open={navOpen} style={{textAlign: "center",   display: "flex", alignItems: "center", justifyContent: "center"}}>
        <div style={{width: "80vw", minHeight: "80vh", margin: "auto", alignItems: "center"}}>
              {(images.length !== 0 && !inProgress) &&
                <GraphPanel
                  images={filteredImageState.filteredImages}
                  logSelected={logMode}
                  onSetLogMode={setLogMode}
                  ratingMode={ratingsToGraph}
                  onSetRatingMode={setRatingsToGraph}
                />
              }
              {(images.length !== 0 && !inProgress) &&
                <DataTable
                  key={uniqueDataKey}

                  images={images}
                  filteredImages={filteredImageState.filteredImages}
                  filtersByMetric={filtersByMetric}

                  onSelectMetric={selectMetric}
                  onSetFiltersForMetric={onSetFiltersForMetric}
                />
              }
              {(!inProgress && images.length === 0) && <AsyncFileImport 
                onStartImport={handleFileStartImport}
                onImport={handleFileImport}
              />}
              {inProgress && <WaitingMessage />}
        </div>
        </MainMinusDrawer>
        {metricsToPlot.map( (metric, index) => {
          return <GraphDialog
            key={`dialog-${index}`}
            images={filteredImageState.filteredImages}
            metricKey={metric}
            handleClose={() => {
              setMetricsToPlot(
                removeItemOnce(metricsToPlot, metric)
              )
            }}
            color={ColorPalette[ index % ColorPalette.length]}
          />
        })}
      </Box>
    </React.Fragment>
  );
}