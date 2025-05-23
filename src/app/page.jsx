'use client'

import AsyncFileImport from "./AsyncFileImport"
import React from 'react'
import DataTable from "./DataTable"
import GraphPanel from "./GraphPanel"
import TempLightboxDialog from "./TempLightboxDialog"
import NavDrawer from "./NavDrawer"
import WaitingMessage from "./WaitingMessage"
import GraphDialog from "./GraphDialog"
import CssBaseline from '@mui/material/CssBaseline';
import { styled } from '@mui/material/styles';
import {
    Box
} from "@mui/material";
import {pathsep} from "./defs"
import {metadata, preview} from "./LightroomDB"
import useScript from "./useScript"
import { readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import Grid from '@mui/material/Grid';
import { listen } from '@tauri-apps/api/event';
import * as CameraData from "./CameraData";

// todo: it's a bit awkward to duplicate this width and easier here
// unclear how to share this code
const drawerOpenWidth = 420;

const withDrawerOpenMixin = (theme) => ({
  width: `calc(100% - 1px - ${drawerOpenWidth}px)`,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  })
});

const withDrawerClosedMixin = (theme) => ({
  // drawerClosedWidth = theme.spacing(7) or theme.spacing(8) respectively
  width: `calc(100% - 1px - ${theme.spacing(7)})`,
  [theme.breakpoints.up('sm')]: { 
    width: `calc(100% - 1px - ${theme.spacing(8)})`
  },
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  })
});

const MainMinusDrawer = styled(
  'main', 
  { shouldForwardProp: (prop) => prop !== 'open' })(({ theme }) => ({
    overflowX: 'hidden',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...withDrawerOpenMixin(theme)
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...withDrawerClosedMixin(theme)
        },
      }
    ]
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
    // TODO: Remove adobe/filepath support
    const folderForImage = "folder" in image ? image["folder"] : image["com_adobe_folder"];
    const filenameForImage = "filename" in image ? image["filename"] : image["com_adobe_absoluteFilepath"];
    folders.add(folderForImage);
    const paths = filenameForImage.split(pathsep);
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
    folders: [...folders].toSorted()
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

const rangeIsEqual = (a,b) => {
  if (a === b)
  {
    return true;
  }
  if( (a === undefined) ^ (b === undefined) )
  {
    return false;
  }
  if( (a.range === undefined) ^ (b.range === undefined) )
  {
    return false;
  }
  return a.range[0] === b.range[0] && a.range[1] === b.range[1];
};

const rangeIsNoLessFiltered = (filters, prevFilters) =>
{
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
  return (filters.range[0] >= prevFilters.range[0]) && (filters.range[1] <= prevFilters.range[1]);
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
    prevFilesystemFilters: [],
    prevFiltersByMetric: {},
    filteredImages: []
  });
  const [navOpen, setNavOpen] = React.useState(true);
  const [filesystemFilters, setFilesystemFilters] = React.useState([]);
  const [filtersByMetric, setFiltersByMetric] = React.useState({});
  const [metricsToPlot, setMetricsToPlot] = React.useState([]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(null);

  const [metadataDBPath, setMetadataDBPath] = React.useState(null);
  const [previewDBPath, setPreviewDBPath] = React.useState(null);
  const [rootFolderToSearch, setRootFolderToSearch] = React.useState(null);
  const [previewDB, setPreviewDB] = React.useState(null);
  const [imageToOrientation, setImageToOrientation] = React.useState(null);

  // graph panel settings, managed by this component because I feel like I might make the
  // ratingsToGraph a lot more involved at some point
  const [logMode, setLogMode] = React.useState(false);
  const [ratingsToGraph, setRatingsToGraph] = React.useState(null);
  const [freqMode, setFreqMode] = React.useState(false);

  const folderData = React.useMemo( ()=> {
      return computeFolderAndFilesystemPathsFromImages(images);
    },
    [images]
  );

  const onLoadCallback = React.useCallback(
    () => {
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
  const handleMetadataFilepath = React.useCallback(
    (filepath) => {
      setMetadataDBPath(filepath);
    },
    []
  );
  const handlePreviewDBFileImport = React.useEffect(
    () => {
      let mounted = true;
      const awaitable = async () => {
        // this callback isn't super-faithful with it's use of the mounted variable
        if (mounted === false)
        {
          return;
        }
        if (previewDBPath === null)
        {
          // todo: set something?
          setPreviewDB(null);
          setImageToOrientation({});
          return;
        }
        if(SQL)
        {
          const blob = await readFile(
            previewDBPath
          );
          const localPreviewDB = new SQL.Database(blob);
          setPreviewDB(localPreviewDB);
          // we don't set limit, offset as we reckon we can slurp the db in one pass
          const entries = preview.queries.select.cache(localPreviewDB);
          const orientationMap = Object.fromEntries(entries.map( e => [e.imageId, e.orientation]));
          setImageToOrientation(orientationMap);
        }
        else
        {
          // if we ever hit this, we need to do some refactoring to have better error behaviour!
          console.error("SQL not available");
          setPreviewDB(null);
          setImageToOrientation({});
        }
      };
      awaitable(); 
      return ()=>{
        mounted = false;
      };
    },
    [previewDBPath]
  );

  const handleRootFolderSet = React.useEffect(
    () => {
      let mounted = true;
      const awaitable = async () => {
        // this callback isn't super-faithful with its use of the mounted variable
        if (mounted === false)
        {
          return;
        }
        if (rootFolderToSearch === null)
        {
          setDB(null);
          setImages([]);
          return;
        }
        setInProgress(true);
        // todo: progressively fetch some images in chunks
        // (or have the table fetch them dynamically?)
        invoke("get_available_images", {offset: 0, limit: 100}).then(
          (response) => {
            if(mounted)
            {
              console.log("received available_images response");
              console.log({response});
              setImages( response.map((x) => CameraData.makeImageFromExif(x)) );
              /*
              if( response.conf_dirs !== null)
              {
                setMetadataDBPath(response.conf_dirs.metadata_db_path);
                setPreviewDBPath(response.conf_dirs.preview_db_path);
              }
              else
              {
                setMetadataDBPath(null);
                setPreviewDBPath(null);
              }
              setRootFolderToSearch(response.root_dir);
              */
            }
            setInProgress(false);
          }
        );
      };
      awaitable(); 
      return ()=>{
        mounted = false;
      };
    },
    [rootFolderToSearch]
  );

  const handleMetadataFileImport = React.useEffect(
    () => {
      let mounted = true;
      const awaitable = async () => {
        // this callback isn't super-faithful with its use of the mounted variable
        if (mounted === false)
        {
          return;
        }
        if (metadataDBPath === null)
        {
          setDB(null);
          setImages([]);
          return;
        }
        if(SQL)
        {
          setInProgress(true);
          const blob = await readFile(
            metadataDBPath
          );
          const localDB = new SQL.Database(blob);
          setDB(localDB);
          // TODO: exception handling in the below?
          // Should the below be a separate callback?
          // TODO: if I'm going to pull the data across in chunks,
          // perhaps I should cache computation in chunks as well?
          const maxLimit = 50000;
          const chunkLength = 5000;
          for (let currentTotal = 0; currentTotal < maxLimit; currentTotal += chunkLength)
          {
            const metadataChunk = metadata.queries.select.images(localDB, chunkLength, currentTotal, "imageid DESC");
            // todo: Andy reckon's he's guessed a bug, as he thinks he sees our image list getting "duplicated"
            // into itself. Let's leave this fix here and diagnose later, if this is the right fix.
            const metadataChunkAsImages = metadataChunk.map(
              (x) => CameraData.makeImageFromLightroom(x)
            );
            if (currentTotal === 0)
            {
              setImages(metadataChunkAsImages);
            }
            else
            {
              setImages( prevImages => prevImages.concat(metadataChunkAsImages));
            }
            if(metadataChunk.length < chunkLength)
            {
              break;
            }
          }
          setInProgress(false);
        }
        else
        {
          // if we ever hit this, we need to do some refactoring to have better error behaviour!
          console.error("SQL not available");
          setDB(null);
          setImages([]);
        }
      };
      awaitable(); 
      return ()=>{
        mounted = false;
      };
    },
    [metadataDBPath]
  );
  const fetchMetadataPath = React.useEffect(
      ()=>{
        let mounted = true;
        if(SQL)
        {
          invoke("get_shared_app_state").then(
            (response) => {
              if(mounted)
              {
                console.log("received response");
                console.log({response});
                if( response.conf_dirs !== null)
                {
                  setMetadataDBPath(response.conf_dirs.metadata_db_path);
                  setPreviewDBPath(response.conf_dirs.preview_db_path);
                }
                else
                {
                  setMetadataDBPath(null);
                  setPreviewDBPath(null);
                }
                setRootFolderToSearch(response.root_dir);
              }
            }
          )
          // TODO: catch here?
        }
        return ()=>{ 
          mounted = false;
        };
      },
      [SQL]
  );
  const listenToStateChanges = React.useEffect(
    () => {
      let mounted = true;
      let unlisten = null;
      const awaitable = async () => {
        unlisten = await listen('shared-app-state-set', (event) => {
          console.log("shared-app-state-set event received");
          console.log({event});
          invoke("get_shared_app_state").then(
            (response) => {
              if(mounted)
              {
                console.log("listened to changes response");
                console.log({response});
                if( response.conf_dirs !== null)
                {
                  setMetadataDBPath(response.conf_dirs.metadata_db_path);
                  setPreviewDBPath(response.conf_dirs.preview_db_path);
                }
                else
                {
                  setMetadataDBPath(null);
                  setPreviewDBPath(null);
                }
                setRootFolderToSearch(response.root_dir);
              }
            }
          );
        });
      };
      awaitable();
      return () => {
        mounted = false;
        if (unlisten !== null)
        {
          unlisten();
          unlisten = null;
        }
      }
    },
    []
  );

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
  const onFilterFolder = React.useCallback( 
    (event, ids)=> {
      onSetFiltersForMetric(
        "folder",
        ids.length === 0 ? undefined : ids
      )
    },
    []
  );
  const onFilterFilesystem = React.useCallback( 
    (event, id)=> {
      setFilesystemFilters([id]);
    },
    []
  );

  const filteredImages = React.useEffect(
    ()=>{
      // todo: maybe we should capture the state of things at the start,
      // of this effect
      // so that we can abandon our computation as necessary?
      if (filesystemFilters.length === 0 && Object.keys(filtersByMetric).length === 0)
      {
        // TODO: figure out how this is threaded, with relation to the inputs
        setFilteredImageState({
          prevImages: images,
          prevFilesystemFilters: filesystemFilters,
          prevFiltersByMetric: filtersByMetric,
          filteredImages: images
        });
        return;
      }

      const imagesAreEqual = filteredImageState.prevImages === images;
      const noFilesystemFilters = filesystemFilters.length === 0;
      const noMetricFilters = Object.keys(filtersByMetric).length === 0;
      if (imagesAreEqual)
      {
        // various accelerations to try and reuse the previous filtering result TODO: UNUSED!
        // slightly different checks, because our filesystem is a tree!
        // are all our new filesystem filters, within our old filter?
        const filesystemIsNoLessFiltered = filteredImageState.prevFilesystemFilters.length === 0 
          || filesystemFilters.length !== 0 && filesystemFilters.every( currentFilter => filteredImageState.prevFilesystemFilters.some( 
              prevFilter => currentFilter.startsWith(prevFilter)
          ));
        const filesystemIsEqual = filteredImageState.filesystemFilters === filesystemFilters;
        const allMetricsEqual = filtersByMetric === filteredImageState.prevFiltersByMetric;
        const unionKeys = Array.from(
          new Set(Object.keys(filtersByMetric)).union(new Set(Object.keys(filteredImageState.prevFiltersByMetric)))
        );
        // for allMetricsEqual we check the same object, but now we care about value equal
        const filterIsNumeric = Object.fromEntries(
          unionKeys.map(k => 
            [
              k, 
              (filtersByMetric[k] !== undefined && filtersByMetric[k].range !== undefined)
              || (filteredImageState.prevFiltersByMetric[k] !== undefined && filteredImageState.prevFiltersByMetric[k].range !== undefined)
            ]
          )
        );
        const metricIsEqual = Object.fromEntries(
            unionKeys.map(k => 
              [
                k, 
                filterIsNumeric[k] ? 
                  rangeIsEqual(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])
                  : arrayEqual(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])
              ]
            )
        );
        const metricIsNoLessFiltered = Object.fromEntries(
            unionKeys.map(k => 
              [
                k, 
                filterIsNumeric[k] ? 
                rangeIsNoLessFiltered(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])
                : isNoLessFiltered(filtersByMetric[k], filteredImageState.prevFiltersByMetric[k])
              ]
            )
        );
        const noLessFiltered = (
          filesystemIsNoLessFiltered
          && Object.values( metricIsNoLessFiltered ).every( b => b )
        );
        // skipFilesystemFiltering if there's no criteria to pass - or we're filtering from a set that's already passed our condition
        const skipFilesystemFiltering = noFilesystemFilters || ( noLessFiltered && filesystemIsEqual);
        const skipMetricFiltering = noMetricFilters || (noLessFiltered && allMetricsEqual);
        const filterFunc = (image, index) => {
          // TODO: Remove adobe/filepath support
          const filenameForImage = "filename" in image ? image["filename"] : image["com_adobe_absoluteFilepath"];
          const filesystemPass = skipFilesystemFiltering || filesystemFilters.some(
            fFilter => filenameForImage.startsWith(fFilter)
          );
          let passMetricFilters = true;
          if(!skipMetricFiltering)
          {
            // todo: we could do smarter per-metric skipping
            for(const [metric, filter] of Object.entries(filtersByMetric))
            {
                if (filter.range)
                {
                  passMetricFilters &= filter.range[0] <= image[metric] && image[metric] <= filter.range[1];
                }
                else
                {
                  passMetricFilters &= filter.includes(image[metric]);
                }
            }
          }
          return filesystemPass && passMetricFilters;
        }
        const imageBase = noLessFiltered ? filteredImageState.filteredImages : images;
        const filteredImages = imageBase.filter(filterFunc);
        setFilteredImageState({
          prevImages: images,
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
            // TODO: Remove adobe/filepath support
            const filenameForImage = "filename" in image ? image["filename"] : image["com_adobe_absoluteFilepath"];
            const filesystemPass = noFilesystemFilters || filesystemFilters.some(
              fFilter => filenameForImage.startsWith(fFilter)
            );
            let passMetricFilters = true;
            if (!noMetricFilters)
            {
              for(const [metric, filter] of Object.entries(filtersByMetric))
              {
                if (filter.range)
                {
                  passMetricFilters &= filter.range[0] <= image[metric] && image[metric] <= filter.range[1];
                }
                else
                {
                  passMetricFilters &= values.includes(image[metric]);
                }
              }
            }
            return filesystemPass && passMetricFilters;
          }
        );
        setFilteredImageState({
          prevImages: images,
          prevFilesystemFilters: filesystemFilters,
          prevFiltersByMetric: filtersByMetric,
          filteredImages: filteredImages
        });
      }
      return () => {};
    },
    [images, filesystemFilters, filtersByMetric]
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
            selectedFolders={filtersByMetric.folder ?? []}
            selectedFilesystem={filesystemFilters}
            folderData={folderData}
            handleDrawerClose={handleDrawerClose}
            handleDrawerOpen={handleDrawerOpen}
          />
        }
        <MainMinusDrawer open={navOpen} style={{textAlign: "center",   display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"}}>
          <div style={{width: "100%", minHeight: "80vh", margin: "auto", alignItems: "center"}}>
          {(images.length !== 0 && !inProgress) &&
            <div style={{width: "100%", height: "40vh"}}>
              <GraphPanel
                images={filteredImageState.filteredImages}
                logSelected={logMode}
                onSetLogMode={setLogMode}
                ratingMode={ratingsToGraph}
                onSetRatingMode={setRatingsToGraph}
                freqSelected={freqMode}
                onSetFreqMode={setFreqMode}
              />
            </div>
          }
          {(images.length !== 0 && !inProgress) &&
            <Box style={{width: "100%"}}>
              <DataTable
                key={uniqueDataKey}

                images={images}
                filteredImages={filteredImageState.filteredImages}
                filtersByMetric={filtersByMetric}

                onSelectMetric={selectMetric}
                onSetFiltersForMetric={onSetFiltersForMetric}

                onSelectImageIndex={(i)=>{setActiveImageIndex(i);}}
              />
            </Box>
          }
          {(!inProgress && images.length === 0) && <AsyncFileImport 
            onImport={handleMetadataFilepath}
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
        {
          activeImageIndex !== null && <TempLightboxDialog
            images={filteredImageState.filteredImages}
            activeImageIndex={activeImageIndex}
            setActiveImageIndex={setActiveImageIndex}
            imageToOrientation={imageToOrientation}
            onClose={()=>{setActiveImageIndex(null);}}
          />
        }
      </Box>
    </React.Fragment>
  );
}