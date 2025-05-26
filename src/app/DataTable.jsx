import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import TableUI from "./TableUI";
import StaticColumnDefs from "./StaticColumnDefs";
import {formatters} from "./CameraData";
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SlideshowIcon from '@mui/icons-material/Slideshow';

// todo: different cells can have different heights
// I presume it's due to the filepath/lens? overflowing the line
// this is annoying, how best to fix this?

// invoke_load(image_id);

const makeFilenameColumn = (def, onSelectImageIndex) =>
{
    return Object.assign(
        {},
        def,
        {cell : ({cell, row}) => {
            const path = row.original[def.accessorKey];
            // TODO: imageid ??? 
            const image_id = row.original["imageid"];
            let reducedPath = path;
            if(path.includes("/") || path.includes("\\"))
            {
                // split on sequences of "\\" or "/" of any length
                // and get last element
                reducedPath = path.split(/[\\\/]+/).slice(-1)[0];
            }
            // TODO: Could this maxLength expand with how much space
            // we're actually allocating to the cell?
            // Or alternatively just rely on content clipping?
            const maxLength = 32;
            const maxCharPath = reducedPath.length > maxLength ? reducedPath.slice(0,maxLength-3) + "..." : reducedPath;
            return <div style={{display: "flex", alignItems: "center", maxHeight: "inherit", textWrap: "nowrap"}}>
                <span title={path} style={{textWrap: "nowrap", maxWidth: "10vw", overflow: "hidden"}}>
                    {maxCharPath}
                </span>
                <span style={{flexGrow: 1}} />
                <IconButton aria-label="copy" size="small"
                    onClick={(e)=>{
                        navigator.clipboard.writeText(path)
                    }}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
                <IconButton aria-label="slideshow" size="small"
                    onClick={()=>{onSelectImageIndex(row.index);}}
                >
                  <SlideshowIcon fontSize="inherit" />
                </IconButton>
            </div>
        }}
    );
};

const makeRatingColumn = (def) =>
{
    return Object.assign(
        {},
        def,
        {cell : ({ cell, row }) => {
            const ratingVal = row.original["rating"];
            // note that: it's quite hard to see the "disabled" rating in action
            // There are some on page-13 of my normal manual-test-data (if page-size=50)
            // In folder "20230923 Walk about Town - Wabi Sabi"

            // Note: it's quite fiddly to get <Rating> to respect the fontSize of the parent and actually
            // I don't like it when they do. The rating looks teeny tiny, relative to the cell-size (maybe I was doubly shrinking it?!)
            // It's more convenient to hack this in place, than to customise the cell display though
            // so we allow the rating to flow out into the cell-padding.
            return <div style={{maxHeight: "0.875rem", overflowY: "visible"}}>
                <Rating
                    value={ ratingVal === "" ? 0 : ratingVal}
                    readOnly
                    size="small"
                    disabled={ratingVal === "" ? true : undefined}
                    style={{marginTop: -2}} // this is very tuned to our sizes right now, obviously!
                />
            </div>
        }}
    );
};

const makeDefaultColumnForEnum = (def, toString) => {
    return Object.assign(
        {},
        {
            cell: ({ cell, row }) => {
                return <span style={{minWidth:"5vw", maxHeight: "inherit", textWrap: "nowrap"}}>{toString(row.original[def.accessorKey])}</span>;
            }
        },
        def
    );
}



const makeDefaultColumn = (def) => {
    return Object.assign(
        {},
        {
            cell: ({ cell, row }) => {
                return <span style={{minWidth:"5vw", maxHeight: "inherit", textWrap: "nowrap"}}>{row.original[def.accessorKey]}</span>;
            }
        },
        def
    );
}

const makeColumns = (onSelectImageIndex, repImage) =>
{
    let defs = [...StaticColumnDefs];
    for (let i = 0; i < defs.length; ++i)
    {
        const k = defs[i].accessorKey;
        if (k === "rating")
        {
            defs[i] = makeRatingColumn( defs[i] );
        }
        else if(k === "filename")
        {
            defs[i] = makeFilenameColumn( defs[i], onSelectImageIndex );
        }
        else if(k in formatters)
        {
            defs[i] = makeDefaultColumnForEnum(
                defs[i],
                formatters[k]
            );
        }
        else
        {
            defs[i] = makeDefaultColumn( defs[i] );
        }
    }
    const filteredDefs = defs.filter(
        d => d.optional !== true || d.accessorKey in repImage
    );
    return filteredDefs;
};

// For pagination, define maximum of data per page

const StaffTable = ({images, filteredImages, fixedHeight, filtersByMetric, onSelectMetric, onSetFiltersForMetric, onSelectImageIndex}) => {

  // Initiate your states
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [filteredItems, setFilteredItems] = useState();

    // handle the search here

    const handleSearch = React.useCallback( (query) => {
        // FIXME: This code is a bug right now,
        // as it depends on images, but doesn't declare that dependency
            // it's not clear how we're going to want to filter
            // I think that we'll want at least
            // but I think we want a data-representation of the filters
            if (query.trim() === "") {
                // Restore the original data when the search query is empty
                // setItems(items);
            } else {
                const filteredData = images.filter((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.age.includes(query) ||
                    item.job.includes(query)
                );
                // setItems(filteredData || []);
            }
        }, 
        []
    );

    const handlePageChange = React.useCallback((page) => {
        setCurrentPage(page);
    });

    const Columns = React.useMemo( () => {
            const Columns = makeColumns(onSelectImageIndex, images[0]);
            return Columns;
        },
        [images]
    );
    const DataLength = images.length;

    return (
        <TableUI
            columns={Columns}
            searchLabel="Search by Name or job title"
            EmptyText="No images in filter"
            handlePageChange={handlePageChange}
            page={currentPage}
            search={handleSearch}
            fixedHeight={fixedHeight}
            images={images}
            filteredImages={filteredImages}
            filtersByMetric={filtersByMetric}

            onSelectMetric={onSelectMetric}
            onSetFiltersForMetric={onSetFiltersForMetric}

            onSelectImageIndex={onSelectImageIndex}
        />
    );
};

export default StaffTable;