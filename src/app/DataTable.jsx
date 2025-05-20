import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import TableUI from "./TableUI";
import StaticColumnDefs from "./StaticColumnDefs";

import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SlideshowIcon from '@mui/icons-material/Slideshow';

// todo: different cells can have different heights
// I presume it's due to the filepath/lens? overflowing the line
// this is annoying, how best to fix this?

// invoke_load(image_id);

const makeColumns = (onSelectImageIndex) =>
{
    // we're going to do custom things with these!
    // assert(StaticColumnDefs[0].accessorKey === "com_adobe_absoluteFilepath");
    // assert(StaticColumnDefs[2].accessorKey === "com_adobe_rating");

    let defs = [...StaticColumnDefs];
    // TODO: Remove this dependence on the filepath being at this index
    if( defs[0].accessorKey === "com_adobe_absoluteFilepath" || defs[0].accessorKey === "filename")
    {
        defs[0] = Object.assign(
            {},
            defs[0],
            {cell : ({cell, row}) => {
                const path = row.original[defs[0].accessorKey];
                // TODO: imageid ??? 
                const image_id = row.original["imageid"];
                let reducedPath = path;
                if(path.includes("/") || path.includes("\\"))
                {
                    // split on sequences of "\\" or "/" of any length
                    // and get last element
                    reducedPath = path.split(/[\\\/]+/).slice(-1)[0];
                }
                const maxLength = 16;
                const maxCharPath = reducedPath.length > maxLength ? reducedPath.slice(0,maxLength-3) + "..." : reducedPath;
                return <React.Fragment>
                    <div style={{display: "flex", alignItems: "center"}}>
                        <span title={path}>
                            {maxCharPath}
                        </span>
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
                </React.Fragment>
            }}
        );
    }

    // TODO: Remove this dependence on it being at this index
    // there's no equivalent in the EXIF metadata
    if(defs[2].accessorKey === "com_adobe_rating")
    {
        defs[2] = Object.assign(
            {},
            defs[2],
            {cell : ({ cell, row }) => {
                const ratingVal = row.original["com_adobe_rating"];
                // note that: it's quite hard to see the "disabled" rating in action
                // There are some on page-13 of my normal manual-test-data (if page-size=50)
                // In folder "20230923 Walk about Town - Wabi Sabi"
                return <Rating
                    value={ ratingVal === "" ? 0 : ratingVal}
                    readOnly
                    size="small"
                    disabled={ratingVal === "" ? true : undefined}
                />
            }}
        );
    }

    for (let i = 0; i < defs.length; ++i)
    {
        const k = defs[i].accessorKey;
        if( k === "com_adobe_absoluteFilepath" || k === "filename" || k === "com_adobe_rating" )
        {
            continue;
        }
        defs[i] = Object.assign(
            {},
            {
                cell: ({ cell, row }) => {
                    return <span style={{minWidth:"5vw"}}>{row.original[k]}</span>;
                }
            },
            defs[i]
        );
    }

    return defs;
};

// For pagination, define maximum of data per page

const ITEMS_PER_PAGE = 6;

const StaffTable = ({images, filteredImages, filtersByMetric, onSelectMetric, onSetFiltersForMetric, onSelectImageIndex}) => {

  // Initiate your states
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [filteredItems, setFilteredItems] = useState()

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
            const Columns = makeColumns(onSelectImageIndex);
            return Columns;
        },
        []
    );
    const DataLength = images.length;

    return (
        <section style={{marginTop: "0.5rem"}}>
            <Box>
                <TableUI
                    columns={Columns}
                    searchLabel="Search by Name or job title"
                    EmptyText="No images in filter"
                    itemsPerPage={ITEMS_PER_PAGE}
                    handlePageChange={handlePageChange}
                    page={currentPage}
                    search={handleSearch}

                    images={images}
                    filteredImages={filteredImages}
                    filtersByMetric={filtersByMetric}

                    onSelectMetric={onSelectMetric}
                    onSetFiltersForMetric={onSetFiltersForMetric}

                    onSelectImageIndex={onSelectImageIndex}
                />
            </Box>
        </section>
    );
};

export default StaffTable;