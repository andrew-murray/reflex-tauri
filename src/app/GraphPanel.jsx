import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import React from 'react'
import * as Graphs from "./Graphs"
import {formatters, fields, titles, parsers} from "./CameraData";
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';

// TODO: Need to implement stops/bins
// It's very weird that shutterspeed 1s might appear next to 100s and 0.0001s
// The density of the graph is defined by the data? Not ideal.

// TODO: Handle null/missing data, it's odd it doesn't blow up currently

function GraphSettingsPanel({logSelected, onSetLogMode, freqSelected, onSetFreqMode, ratingMode, onSetRatingMode})
{
    // TODO: Replace "logarithmic" with an icon
    return <List style={{paddingLeft: "1em", paddingRight: "1em"}}>
        <ListItem key="ln-mode"  disablePadding>
            <ToggleButton
              selected={logSelected}
              onChange={() => onSetLogMode((prevSelected) => !prevSelected)}
              style={{width: "100%", textTransform: "none"}}
            >
                y=ln(y)
            </ToggleButton>
        </ListItem>
        <ListItem key="rating-mode" disablePadding>
            <ToggleButton
              selected={ratingMode !== null}
              onChange={() => {
                if(ratingMode === null)
                {
                    onSetRatingMode([5,4,3,2,1]);
                }
                else
                {
                    onSetRatingMode(null);
                }
              }}
              style={{width: "100%"}}
            >
                rating
            </ToggleButton>
        </ListItem>
        <ListItem key="freq-mode"  disablePadding>
            <ToggleButton
              selected={freqSelected}
              onChange={() => onSetFreqMode((prevSelected) => !prevSelected)}
              style={{width: "100%"}}
            >
                rating %
            </ToggleButton>
        </ListItem>
    </List>
}

export default function GraphPanel({images, logSelected, onSetLogMode, freqSelected, onSetFreqMode, ratingMode, onSetRatingMode}) {
    // graphs are going to be [shutter, aperture, ISO] naturally
    const shutter = "shutter_speed_value";
    const aperture = "aperture_value";
    const iso = "iso_speed_rating";

    // Note: metadata may not be present!
    // TODO: Exclude bad data?

    const reducedData = React.useMemo(
        ()=> {
            const groupedData = images.reduce( 
                (acc, image) => {
                    for (const field of [shutter, aperture, iso])
                    {
                        const value = image[field];
                        // we include the value in the object
                        // as the value in the dictionary will be a string
                        acc[field][value] = acc[field][value] || {
                            name: value, 
                            count: 0, 
                            ratingCounts: {
                                1: 0,
                                2: 0,
                                3: 0,
                                4: 0,
                                5: 0
                            } 
                        };
                        acc[field][value].count += 1;
                        if (image.rating !== undefined)
                        {
                            acc[field][value].ratingCounts[image.rating] += 1;
                        }
                    }
                    return acc;
                },
                {
                    [shutter]: {},
                    [aperture]: {},
                    [iso]: {}
                }
            );

            // let's ensure the values are parsed properly
            // const parsedGroupedData = 
            let parsedGroupedData = {};
            const defaultParser = (s) => {
                return s;
            };


            for (const field of [shutter, aperture, iso])
            {
                const inputFieldDict = groupedData[field];
                const parserForField = parsers[field] || defaultParser;
                const formatterForField = formatters[field] || defaultParser;
                let outputFieldValues = []
                for (const [k , v] of Object.entries(inputFieldDict))
                {
                    // TODO: We could drop v.name == "" here?
                    // it's not clear if it's acceptable to hide them

                    // TODO: parser should be allowed to throw here,
                    // and we should handle it
                    // choose to say the frequency at-this-count is zero
                    // so that it's not plotted, even though strictly it's mathematically "undefined"
                    const ratingFreqs = Object.fromEntries(
                        Object.entries(v.ratingCounts).map(
                            ([rk, rv]) => [rk, v.count === 0 ? 0 : 100 * (rv/v.count)]
                        )
                    );

                    outputFieldValues.push({
                        name: formatterForField(v.name),
                        value: parserForField(v.name),
                        count: v.count,
                        ratingCounts: v.ratingCounts,
                        ratingFreqs
                    });
                }
                if (field === shutter)
                {
                    outputFieldValues.sort(
                        (a,b) => b.value - a.value // reverse sort
                    );
                }
                else
                {
                    outputFieldValues.sort(
                        (a,b) => a.value - b.value
                    );
                }
                parsedGroupedData[field] = outputFieldValues;
            }

            return parsedGroupedData;
        },
        [images]
    );
    // I think.... I need to define good scales
    // for "stopped" categories
    // as ... scatter plots suck ... and I'd rather have them as bar charts
    // but to do that, I need fixed categories


    return <Paper style={{width: "100%", height: "100%"}}>
        <Grid container columns={10} style={{width: "100%", height: "100%"}}>
          <Grid item xs={3} style={{textAlign: "center", height: "100%"}}>
            <Paper elevation={0} square={true} style={{margin: "auto", width: "100%", height: "100%", paddingTop: "1em", paddingRight: "0.5em"}}>
                <Graphs.BarGraph
                    data={reducedData[shutter]}
                    dataKey={shutter}
                    color={Graphs.colorsForMetrics[shutter]}
                    tooltipColor={Graphs.colorsForMetrics[shutter]}
                    logMode={logSelected ? true : undefined}
                    freqMode={freqSelected ? true : undefined}
                    ratingMode={ratingMode}
                />
            </Paper>
          </Grid>
          <Grid item xs={3} style={{textAlign: "center", height: "100%"}}>
            <Paper elevation={0} square={true} style={{margin: "auto", width: "100%", height: "100%", paddingTop: "1em", paddingRight: "0.5em"}}>
                <Graphs.BarGraph
                    data={reducedData[aperture]}
                    dataKey={aperture}
                    color={Graphs.colorsForMetrics[aperture]}
                    tooltipColor={Graphs.colorsForMetrics[aperture]}
                    logMode={logSelected ? true : undefined}
                    freqMode={freqSelected ? true : undefined}
                    ratingMode={ratingMode}
                />
            </Paper>
          </Grid>
          <Grid item xs={3} style={{textAlign: "center", height: "100%"}}>
            <Paper elevation={0} square={true} style={{margin: "auto", width: "100%", height: "100%", paddingTop: "1em", paddingRight: "0.5em"}}>
                <Graphs.BarGraph
                    data={reducedData[iso]}
                    dataKey={iso}
                    color={Graphs.colorsForMetrics[iso]}
                    tooltipColor={Graphs.colorsForMetrics[iso]}
                    logMode={logSelected ? true : undefined}
                    freqMode={freqSelected ? true : undefined}
                    ratingMode={ratingMode}
                />
            </Paper>
          </Grid>
            <Grid item xs={1} style={{height: "100%"}}>
                <GraphSettingsPanel 
                    logSelected={logSelected}
                    onSetLogMode={onSetLogMode}
                    freqSelected={freqSelected}
                    onSetFreqMode={onSetFreqMode}
                    ratingMode={ratingMode}
                    onSetRatingMode={onSetRatingMode}
                />
            </Grid>
        </Grid>
    </Paper>
}