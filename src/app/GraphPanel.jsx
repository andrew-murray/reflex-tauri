import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import React from 'react'
import * as Graphs from "./Graphs"
import {fields, titles, parsers} from "./CameraData";
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

function GraphSettingsPanel({logSelected, onSetLogMode, ratingMode, onSetRatingMode})
{
    return <List>
        <ListItem key="ln-mode">
            <ToggleButton
              selected={logSelected}
              onChange={() => onSetLogMode((prevSelected) => !prevSelected)}
            >
                ln
            </ToggleButton>
        </ListItem>
        <ListItem key="rating-mode">
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
            >
                rating
            </ToggleButton>
        </ListItem>
    </List>
}

export default function GraphPanel({images, logSelected, onSetLogMode, ratingMode, onSetRatingMode}) {
    // graphs are going to be [shutter, aperture, ISO] naturally
    const shutter = fields.shutter;
    const aperture = fields.aperture;
    const iso = fields.iso;

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
                        if (image["com_adobe_rating"] !== undefined)
                        {
                            acc[field][value].ratingCounts[image["com_adobe_rating"]] += 1;
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
            for (const field of [shutter, aperture, iso])
            {
                const inputFieldDict = groupedData[field];
                const parserForField = parsers[field];
                let outputFieldValues = []
                for (const [k , v] of Object.entries(inputFieldDict))
                {
                    // TODO: We could drop v.name == "" here?
                    // it's not clear if it's acceptable to hide them

                    // TODO: parser should be allowed to throw here,
                    // and we should handle it
                    outputFieldValues.push({
                        name: v.name,
                        value: parserForField(v.name),
                        count: v.count,
                        ratingCounts: v.ratingCounts
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


    return <Paper style={{width: "100%", height: "50vh"}}>
        <Grid container>
            <Grid item xs={11}>
                <Grid container>
                  <Grid item xs={4} style={{textAlign: "center"}}>
                    <Paper style={{margin: "auto", width: "100%", height: "50vh"}}>
                        <Graphs.BarGraph
                            data={reducedData[shutter]}
                            dataKey={name[shutter]}
                            color="#c0ea02"
                            logMode={logSelected ? true : undefined}
                            ratingMode={ratingMode}
                        />
                    </Paper>
                  </Grid>
                  <Grid item xs={4} style={{textAlign: "center"}}>
                    <Paper style={{margin: "auto", width: "100%", height: "50vh"}}>
                        <Graphs.BarGraph
                            data={reducedData[aperture]}
                            dataKey={name[aperture]}
                            color="#eac002"
                            logMode={logSelected ? true : undefined}
                            ratingMode={ratingMode}
                        />
                    </Paper>
                  </Grid>
                  <Grid item xs={4} style={{textAlign: "center"}}>
                    <Paper style={{margin: "auto", width: "100%", height: "50vh"}}>
                        <Graphs.BarGraph
                            data={reducedData[iso]}
                            dataKey={name[iso]}
                            color="#4090c0"
                            logMode={logSelected ? true : undefined}
                            ratingMode={ratingMode}
                        />
                    </Paper>
                  </Grid>
                </Grid>
            </Grid>
            <Grid item xs={1}>
                <GraphSettingsPanel 
                    logSelected={logSelected}
                    onSetLogMode={onSetLogMode}
                    ratingMode={ratingMode}
                    onSetRatingMode={onSetRatingMode}
                />
            </Grid>
        </Grid>
    </Paper>
}