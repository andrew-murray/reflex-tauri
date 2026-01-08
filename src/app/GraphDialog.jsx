'use client'

import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import React from 'react'
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import ClearIcon from '@mui/icons-material/Clear';
import * as Graphs from "./Graphs"
import StaticColumnDefs from "./StaticColumnDefs";
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import AsyncImageFromFile from "./AsyncImageFromFile";

// emulates how typeScript emulates enums
const GraphModeEnum = { 
  Pie: "Pie",
  Bar: "Bar"
};

function GraphPickerWidget({graphMode, setGraphMode})
{
  return <ToggleButtonGroup
    value={graphMode}
    exclusive
    onChange={(event, newGraphMode)=>{
      setGraphMode(newGraphMode);
    }}
  >
    <ToggleButton 
        value={GraphModeEnum.Pie}
      >
      <PieChartIcon
      />
    </ToggleButton>
    <ToggleButton
        value={GraphModeEnum.Bar}
      >
      <BarChartIcon
      />
    </ToggleButton>
  </ToggleButtonGroup>
}

export default function GraphDialog({images, metricKey, handleClose, color}) {
  const colorForBarGraph = color || Graphs.colorsForMetrics[metricKey] || undefined;
  // Get the 0th element assuming this to be unique if-it-exists and undefined otherwise
  let title = metricKey;
  const matchedColumn = StaticColumnDefs.filter(c => c.accessorKey === metricKey)[0];
  if (matchedColumn !== undefined)
  {
    title = matchedColumn.header;
  }
  const [graphMode, setGraphMode] = React.useState(GraphModeEnum.Pie);
  return <Dialog
    open={true}
    onClose={handleClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
    style={{overflow: "hidden"}}
  >
    <DialogTitle id="graph-dialog-title">
      {title}
    </DialogTitle>
    <div style={{position: "absolute", right: 54, top: 8}}>
      <GraphPickerWidget
        graphMode={graphMode}
        setGraphMode={setGraphMode}
        style={{paddingRight: "2rem"}}
      />
    </div>
    <div  style={{position: "absolute", right: 8, top: 8}}>
      <IconButton
        onClick={handleClose}
       
      >
        <ClearIcon />
      </IconButton>
    </div>
    <DialogContent dividers style={{width: 500, height: 500, padding: 10, overflow: "hidden"}}>
      {graphMode === GraphModeEnum.Bar && 
        <Graphs.BarGraphForDialog
          data={images}
          dataKey={metricKey}
          color={colorForBarGraph}
          tooltipColor={colorForBarGraph}
        />
      }
      {graphMode === GraphModeEnum.Pie &&
        <Graphs.PieGraph
          data={images}
          dataKey={metricKey}
          color={color}
        />
      }
    </DialogContent>
  </Dialog>
};