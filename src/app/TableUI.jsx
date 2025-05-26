import {
    Box,
    Button,
    IconButton,
    Paper,
    Skeleton,
    Table as MuiTable,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Menu,
    MenuItem,
    Pagination,
    styled
} from "@mui/material";
import React from 'react'
import { useTheme } from '@mui/material/styles';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import AddchartIcon from '@mui/icons-material/Addchart';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import DoneIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';
import { ChangeEvent, FC, memo, ReactElement, useMemo, useState, useCallback, Fragment } from "react";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {GetFormattedData} from "./Graphs";
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import ButtonGroup from '@mui/material/ButtonGroup';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Switch from '@mui/material/Switch';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import StaticColumnDefs from "./StaticColumnDefs";
import ListSubheader from '@mui/material/ListSubheader';
import Slider from '@mui/material/Slider';
import * as Graphs from "./Graphs"
import Tooltip from '@mui/material/Tooltip';


// Styles with styled-component

export const StyledTableRow = styled(TableRow)(({ theme }) => {
  const dark = theme.palette.mode === "dark";
  const common = {
    "&:last-child td": { 
      border: 0
    },
    "&:last-child th":  {
        border: 0
    },
    ":hover": {
        backgroundColor: theme.palette.background.selected
    }
  };
  if (dark)
  {
    return Object.assign(
      {},
      {
        tr:  {
          backgroundColor: theme.palette.background.paper
        }
      },
      common
    )
  }
  else
  {
    // light mode needs a bit more contrast
    return Object.assign(
      {},
      {
        "&:nth-of-type(odd)":  {
           backgroundColor: theme.palette.background.alternate
        }
      },
      // common must come last, for the hover to apply after the backgroundColor
      common
    )
  }
});

// TODO: It's a little annoying that we grow the pagination rather than "spreading out" the table
// could that be managed?
export const StyledPagination = styled(Pagination)`
    display: flex;
    flex-grow: 1;
    justify-content: center;
    margin-top: 0rem;
    min-height: 40px;
`;

const filteredNumeric = [
  "iso_speed_rating",
  "shutter_speed_value",
  "aperture_value",
  "focal_length"
];

export function NumericFilterDialog({images, filteredImages, metricKey, filtersForMetric, handleClose, onSetFiltersForMetric, onSelectImageIndex}) {
  // TODO: For shutterSpeed at least, we need to implement
  // a different scale. So much of the shutter speed is in the (0,1) range, but ... it's reasonable to have values from 0-60
  // https://mui.com/material-ui/react-slider/#non-linear-scale
  let title = metricKey;
  const matchedColumn = StaticColumnDefs.filter(c => c.accessorKey === metricKey)[0];
  if (matchedColumn !== undefined)
  {
    title = matchedColumn.header;
  }
  const formattedData = useMemo(
    ()=>{
      return GetFormattedData(filteredImages, metricKey);
    },
    [filteredImages, metricKey]
  );
  const [filters, setFilters] = useState( filtersForMetric === undefined ? null : filtersForMetric );
  const handleChange = (event, newValues) => {
    setValues(newValues);
  };

  const dataMin = formattedData.length === 0 ? 0 : Math.min(...formattedData.map(d => d.name));
  const dataMax = formattedData.length === 0 ? 1 :Math.max(...formattedData.map(d => d.name));
  // even if our data exhibits a narrower range than our current filters, retain the current filters
  const filterMin = filtersForMetric !== undefined ? filtersForMetric.range[0] : dataMin;
  const filterMax = filtersForMetric !== undefined ? filtersForMetric.range[1] : dataMax;

  const [values, setValues] = React.useState(null);

  const filterRange = filterMax - filterMin;

  let filterIncrement = filterRange/100.0;
  // let's arbitrarily clamp if we're dealing with teeny quantities
  if (filterIncrement < 0.05)
  {
    filterIncrement = 0.05;
  }
  const sliderStep = Number(filterIncrement.toPrecision(2));
  return <Dialog
    open={true}
    onClose={handleClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="graph-dialog-title">
      Filter by {title}
    </DialogTitle>
    <IconButton
      onClick={handleClose}
      style={{position: "absolute", right: 8, top: 8}}
    >
      <ClearIcon />
    </IconButton>
    <DialogContent
      dividers
      style={{padding: 10, minWidth: 500, maxHeight: 1200}}
    >
      <Box style={{display: "flex", justifyContent: "center", padding: 5}}>
        <Paper style={{width: "100%", minWidth: 500, height: 400, padding: 10, overflow: "hidden"}}>
          <Graphs.BarGraphForDialog
            data={images}
            dataKey={metricKey} 
          />
        </Paper>
      </Box>
      <Box style={{minHeight: 50, margin: "15px 25px 15px"}}>
        <Slider
          getAriaLabel={() => `${title} Filter Range`}
          value={values === null ? [filterMin, filterMax] : values}
          onChange={handleChange}
          valueLabelDisplay="auto"
          style={{width: "100%"}}
          min={filterMin}
          max={filterMax}
          step={sliderStep}
        />
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose}>Cancel</Button>
      <Button onClick={()=>{ 
        onSetFiltersForMetric(metricKey, values === null ? undefined : { range: values });
        handleClose();
      }}>Apply</Button>
    </DialogActions>
  </Dialog>
};

export function FilterDialog({images, filteredImages, metricKey, filtersForMetric, handleClose, onSetFiltersForMetric, onSelectImageIndex}) {

  if (filteredNumeric.includes(metricKey)){
    return <NumericFilterDialog
      images={images}
      filteredImages={filteredImages}
      metricKey={metricKey}
      filtersForMetric={filtersForMetric}
      handleClose={handleClose}
      onSetFiltersForMetric={onSetFiltersForMetric}
      onSelectImageIndex={onSelectImageIndex}
    />
  }
  let title = metricKey;
  const matchedColumn = StaticColumnDefs.filter(c => c.accessorKey === metricKey)[0];
  if (matchedColumn !== undefined)
  {
    title = matchedColumn.header;
  }
  const formattedData = useMemo(
    ()=>{
      return GetFormattedData(filteredImages, metricKey);
    },
    [filteredImages, metricKey]
  );
  const [filters, setFilters] = useState( filtersForMetric === undefined ? null : filtersForMetric );
  const names = formattedData.map(d => d.name).toSorted();
  const applyDisabled = filters !== null && filters.length === 0;
  const makeApplyButton = () => {
    return (
      <Button
        onClick={()=>{
          onSetFiltersForMetric(metricKey, filters === null || filters.length === 0 ? undefined : filters);
          handleClose();
        }}
        disabled={applyDisabled ? true : undefined}
      >
      Apply
      </Button>
    );
  };
  return <Dialog
    open={true}
    onClose={handleClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="graph-dialog-title">
      Filter by {title}
    </DialogTitle>
    <IconButton
      onClick={handleClose}
      style={{position: "absolute", right: 8, top: 8}}
    >
      <ClearIcon />
    </IconButton>
    <DialogContent dividers style={{padding: 10, minWidth: 300, maxHeight: 600}}>
    <div style={{display: "flex", justifyContent: "center"}}>
      <Paper style={{width: "100%"}}>
        <List style={{width: "100%", overflowY: "auto"}}>
          {names.map(name => {
            return <ListItem key={name}>
                <ListItemIcon>
                <Checkbox
                  edge="end"
                  checked={filters === null || filters.includes(name)}
                  onChange={(event)=>{
                    setFilters(
                      prevFilters => {
                        if (event.target.checked)
                        {
                          // prevFilters might be null
                          const withElement = (prevFilters || []).concat([name]);
                          if (withElement.length === names.length)
                          {
                            // todo: I'm a little worried, we're not using Sets...
                            return null;
                          }
                          else
                          {
                            return withElement;
                          }
                        }
                        else // event.target.checked has to be false, therefore remove from the filters
                        {
                          return (prevFilters || names).filter(x => x !== name);
                        }
                      }
                    )
                  }}
                  inputProps={{ 'aria-label': 'controlled' }}
                />
                </ListItemIcon>
                <ListItemText primary={name} />
            </ListItem>
          })}
        </List>
      </Paper>
    </div>
    </DialogContent>
    <DialogActions>
      <Button onClick={()=>setFilters([])}>Clear All</Button>
      <Button onClick={()=>setFilters(null)}>Select All</Button>
      <div style={{flexGrow: 1}} />
      <Button onClick={handleClose}>Cancel</Button>
      {applyDisabled && 
        <Tooltip
          title="Select some filters to apply"
        >
          <span>{makeApplyButton()}</span>
        </Tooltip>
      }
      {!applyDisabled && 
        makeApplyButton()
      }
    </DialogActions>
  </Dialog>
};

function useClientRectAndWatchResize() {
  const [rect, setRect] = useState(null);
  const ref = React.useCallback(node => {
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  React.useEffect(() => {
    if (!ref.current) return;
    const resizeObserver = new ResizeObserver(() => {
      console.log({boxRef, boxRect, paginationRect, paginationRef});
      ref(ref.current);
    });
    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect(); // clean up 
  }, []);
  return [rect, ref];
}

const TableUI = ({
  images,
  filteredImages,
  filtersByMetric,
  columns,
  isFetching,
  skeletonCount = 10,
  skeletonHeight = 28,
  headerComponent,
  search,
  onClickRow,
  onSelectMetric,
  onSetFiltersForMetric,
  fixedHeight,
  page,
  handlePageChange,
  searchLabel = "Search",
  EmptyText,
  children,
  handleRow
}) => {
    const [activeFilterDialog, setActiveFilterDialog] = useState(null);
    const [fontSizeHeight, setFontSizeHeight] = React.useState(0);
    const boxRef = useCallback(node => {
      if (node !== null) {
        // TODO: this is a pattern in a stackoverflow,
        // however it's weird that we just discard "px"
        const computedFontSize = parseFloat(getComputedStyle(node).fontSize);
        setFontSizeHeight(computedFontSize);
      }  
    }, []);
    const memoizedData = useMemo(() => filteredImages, [filteredImages]);
    const memoizedColumns = useMemo(
        () => columns, 
        [columns]
    );
    const memoisedHeaderComponent = useMemo(
      () => headerComponent,
      [headerComponent]
    );


    // const emSize = boxRef !== null ? parseFloat(getComputedStyle(boxRef.current).fontSize) : 0;
    // header contains two buttons, vertically
    // each sized to be 1em, with padding of 4px (top and bottom)
    // fontSize is set to 1.25 rem internal to the buttons
    const headerHeight = 2 * ((1.25 * fontSizeHeight) + 2 * 4);
    // muiButtonSize appears to be 32 pixels... we set minHeight to 40
    // to ensure that it's appropriately padded, but at the moment
    // we let pagination grow to fill the space left when we can't fit a full row
    const paginationHeight = 32 + 2 * 4;
    const availableHeight = fixedHeight - headerHeight - paginationHeight;

    // so I can't tell you why (need to understand border sharing better)
    // but the nuances of how css shares borders, mean our 1 pixel border, becomes a 0.6667 border for each gap between rows!
    // each row also has 2 * padding of 16 pixels (specified in pixels)
    // ...and the content size is also relevant!
    // we're going to add a mechanism to limit the row content to one line later
    // TODO: 0.875 fontSizeHeight in MuiTable table-row - Shouldn't assume this.
    const rowHeight = (0.875 * fontSizeHeight) + 2 * 16;
    // FIXME: Actually the last cell's border ends up being half-this, 
    // as it gets border: 0, but ... it's not clear how border collapsing is really working
    // so my maths is slightly off and it's not clear how to incorporate it ... 
    const borderHeight = (2.0/3.0);
    // now ... 
    // the easy way for us to calculate how many rows fit, is to pretend we have room for an additional border
    // as for n-rows, we need room for n-1 borders... 
    // our calculation of borders is off by literally a couple of pixels, so we fudge
    const availableVirtualHeight = availableHeight + borderHeight - 2;
    const rowsInAvailableHeight = Math.floor(availableVirtualHeight / (rowHeight + borderHeight));

    const itemsPerPage = fontSizeHeight === 0 ? 5 : Math.max(5, rowsInAvailableHeight);
    const estimatedRowHeight = rowHeight;
    const estimatedTBodyHeight = (itemsPerPage * (rowHeight + borderHeight)) - borderHeight;
    const estimatedTBodyHeightNoBorders = (itemsPerPage * rowHeight);
    const estimatedTableHeight = estimatedTBodyHeight + headerHeight;
    const estimatedBoxHeight = estimatedTableHeight + paginationHeight;
    const theme = useTheme();

    const pageCount = Math.ceil(memoizedData.length/itemsPerPage);

    const { getHeaderGroups, getRowModel, getAllColumns } = useReactTable({
      data: memoizedData,
      columns: memoizedColumns,
      getCoreRowModel: getCoreRowModel(),
      manualPagination: true,
      pageCount
    });

    const skeletons = Array.from({ length: skeletonCount }, (x, i) => i);

    const columnCount = getAllColumns().length;

    const noDataFound =
      !isFetching && (!memoizedData || memoizedData.length === 0);

    const handleSearchChange = (
      e
    ) => {
      search && search(e.target.value);
    };
    const pageStart = page * itemsPerPage;
    const pageEnd = Math.min( (page + 1) * itemsPerPage, memoizedData.length);

    const translatePageChange = useCallback(
        (
          event,
          currentPage
        ) => {
          handlePageChange(currentPage - 1);
        },
        [handlePageChange]
    );

    const clearFiltersForMetric = useCallback(
      (metric)=>{
        onSetFiltersForMetric(metric, undefined);
      },
      []
    );


    return (
      <Box style={{height: fixedHeight, display: "flex", flexDirection: "column"}} ref={boxRef}>
        {boxRef !== null && 
          <Box>
          <Paper elevation={2} style={{ padding: "0 0 0 0",  overflowX: "auto"}}>
            <MuiTable style={{lineHeight: 1}}>
              {!isFetching && (
                <TableHead>
                  {getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} style={{backgroundColor: theme.palette.background.selected}}>
                      {headerGroup.headers.map((header) => {
                        return <TableCell key={header.id} className="text-sm font-cambon" style={{padding: "0rem 1rem 0 1rem"}}>
                          <div style={{display: "flex"}}>
                            <div style={{flexGrow: 1, alignContent: "center", paddingRight: "1rem"}}>
                              {header.isPlaceholder
                                ? null :
                                flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )
                              }
                            </div>
                            <div style={{display: "flex"}}>
                            {(!header.isPlaceholder) &&
                              <ButtonGroup variant="outlined" aria-label="Loading button group" orientation="vertical" style={{height: "100%"}}>
                                <Button
                                  onClick={()=>onSelectMetric(header.column.columnDef.accessorKey)}
                                  disabled={header.column.columnDef.plottable ? undefined : true}
                                  style={{ borderRadius: 0, padding: 4}}
                                >
                                  <AddchartIcon fontSize="small"/>
                                </Button>
                                <Button
                                  disabled={header.column.columnDef.filterable? undefined: true}
                                  onClick={()=>{
                                    if(filtersByMetric[header.column.columnDef.accessorKey] === undefined)
                                    {
                                      setActiveFilterDialog(header.column.columnDef.accessorKey)
                                    }
                                    else
                                    {
                                      clearFiltersForMetric(header.column.columnDef.accessorKey)
                                    }
                                  }}
                                  style={{ borderRadius: 0 , padding: 4}}
                                >
                                  {filtersByMetric[header.column.columnDef.accessorKey] === undefined ? 
                                    <FilterAltIcon fontSize="small"/>
                                    : <FilterAltOffIcon size="small"/>
                                  }
                              </Button>
                              </ButtonGroup>
                            }
                            </div>
                          </div>
                        </TableCell>
                      })}
                    </TableRow>
                  ))}
                </TableHead>
              )}
              <TableBody>
                {!isFetching ? (
                  getRowModel()?.rows.slice(pageStart, pageEnd).map((row) => (
                    <StyledTableRow key={row.id} onClick={handleRow}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          onClick={() => onClickRow?.(cell, row)}
                          key={cell.id}
                          className="font-graphik"
                          style={{lineHeight: 1, maxHeight: "0.875rem"}}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>

                      ))}
                    </StyledTableRow>
                  )
                  )
                ) : (
                  <>
                    {skeletons.map((skeleton) => (
                      <TableRow key={skeleton}>
                        {Array.from({ length: columnCount }, (x, i) => i).map(
                          (elm) => (
                            <TableCell key={elm} style={{lineHeight: 1, maxHeight: "0.875rem"}}>
                              <Skeleton height={skeletonHeight} />
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </MuiTable>
          </Paper>
        </Box>
      }
      {noDataFound && (
        <Box my={2} textAlign="center">
          {EmptyText}
        </Box>
      )}
      {pageCount > 1 && page !== undefined && (
       <StyledPagination
           count={pageCount}
           page={page+1}
           onChange={translatePageChange}
           color="primary"
           showFirstButton 
           showLastButton
           siblingCount={3}
         />
      )}
      {activeFilterDialog && <FilterDialog
        metricKey={activeFilterDialog}
        images={images}
        filteredImages={filteredImages}
        handleClose={()=>setActiveFilterDialog(null)}
        filtersForMetric={filtersByMetric[activeFilterDialog]}
        onSetFiltersForMetric={onSetFiltersForMetric}
      />
      }
      </Box>
    );
  };

  TableUI.defaultProps = {
    EmptyText: "No Data is found"
  }


  export default memo(TableUI);