import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TableUI from "./TableUI";
import StaticColumnDefs from "./StaticColumnDefs";

// todo: different cells can have different heights
// I presume it's due to the filepath/lens? overflowing the line
// this is annoying, how best to fix this?

const makeColumns = (columnKeys) => {
    return columnKeys.map(k => {
        return Object.assign(
            {
                header: k,
                cell: ({ cell, row }) => {
                    return <div style={{minWidth:"7vw"}}>{row.original[k]}</div>;
                }
            },
            // we assume there's precisely one
            // it may override header/cell/other attributes!
            StaticColumnDefs.filter(d => d.accessorKey === k)[0]
        )
    });
};

// For pagination, define maximum of data per page

const ITEMS_PER_PAGE = 50;

const StaffTable = ({images, filteredImages, filtersByMetric, onSelectMetric, onSetFiltersForMetric}) => {

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
            const selectedColumnKeys = StaticColumnDefs.map(d => d.accessorKey);
            const Columns = makeColumns(selectedColumnKeys);
            return Columns;
        },
        []
    );
    const DataLength = images.length;

    return (
        <section className="mt-5">
            <h3 className="text-[18px] mb-2 md:text-[24px] text-black">
            </h3>
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
                />
            </Box>
        </section>
    );
};

export default StaffTable;