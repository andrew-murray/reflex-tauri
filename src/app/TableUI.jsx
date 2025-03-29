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
import {titles} from "./CameraData";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {GetFormattedData} from "./Graphs";
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import StaticColumnDefs from "./StaticColumnDefs";


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
      common,
      {
        tr:  {
          backgroundColor: theme.palette.background.paper
        }
      }
    )
  }
  else
  {
    // light mode needs a bit more contrast
    return Object.assign(
      {},
      common,
      {
        "&:nth-of-type(odd)":  {
           backgroundColor: theme.palette.background.alternate
        }
      }
    )
  }
});

export const StyledPagination = styled(Pagination)`
    display: flex;
    justify-content: center;
    margin-top: 1rem;
`;

export function FilterDialog({images, filteredImages, metricKey, filtersForMetric, handleClose, onSetFiltersForMetric, onSelectImageIndex}) {

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
  return <Dialog
    open={true}
    onClose={handleClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="graph-dialog-title">
      Filter by {title}
      <IconButton
        onClick={handleClose}
      >
        <ClearIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent style={{width: 500, height: 500, padding: 10}}>
      <List>
        {names.map(name => {
          return <ListItem key={name}>
            <ListItemIcon>
              <Checkbox
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
              <Typography>
                {name}
              </Typography>
            </ListItemIcon>
          </ListItem>
        })}
      </List>
      <IconButton
        onClick={()=>{ 
          onSetFiltersForMetric(metricKey, filters === null ? undefined : filters);
          handleClose();
        }}
      >
        <DoneIcon />
      </IconButton>
    </DialogContent>
  </Dialog>
};

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
  page,
  handlePageChange,
  searchLabel = "Search",
  EmptyText,
  children,
  itemsPerPage,
  handleRow
}) => {
    const [activeFilterDialog, setActiveFilterDialog] = useState(null);
    const memoizedData = useMemo(() => filteredImages, [filteredImages]);
    const memoizedColumns = useMemo(
        () => columns, 
        [columns]
    );
    const memoisedHeaderComponent = useMemo(
      () => headerComponent,
      [headerComponent]
    );

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
      <Paper elevation={2} style={{ padding: "0 0 1rem 0" }}>
        {false && <Box paddingX="1rem">
              {memoisedHeaderComponent && <Box>{memoisedHeaderComponent}</Box>}
              {search && (
                <TextField
                  onChange={handleSearchChange}
                  size="small"
                  label={searchLabel}
                  margin="normal"
                  variant="outlined"
                  fullWidth
                />
              )}
            </Box>
        }   
        <Box style={{ overflowX: "auto" }}>
          <MuiTable>
            {!isFetching && (
              <TableHead>
                {getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} style={{backgroundColor: theme.palette.primary.main}}>
                    {headerGroup.headers.map((header) => {
                      return <TableCell key={header.id} className="text-sm font-cambon">

                        {header.isPlaceholder
                          ? null :
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        }
                        {(!header.isPlaceholder) && <Fragment>
                          {header.column.columnDef.plottable
                          && <IconButton
                            onClick={()=>onSelectMetric(header.column.columnDef.accessorKey)}
                          >
                            <AddchartIcon />
                          </IconButton>
                          }
                          {header.column.columnDef.filterable 
                          && filtersByMetric[header.column.columnDef.accessorKey] === undefined
                          && <IconButton
                                onClick={()=>setActiveFilterDialog(header.column.columnDef.accessorKey)}
                              >
                                <FilterAltIcon />
                              </IconButton>
                          }
                          {header.column.columnDef.filterable 
                          && filtersByMetric[header.column.columnDef.accessorKey] !== undefined
                          && <IconButton
                                onClick={()=>clearFiltersForMetric(header.column.columnDef.accessorKey)}
                              >
                                <FilterAltOffIcon />
                              </IconButton>
                          }
                        </Fragment>
                        }
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
                          <TableCell key={elm}>
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
        </Box>
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
      </Paper>
    );
  };

  TableUI.defaultProps = {
    EmptyText: "No Data is found"
  }


  export default memo(TableUI);