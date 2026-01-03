import { BarChart, PieChart, Pie, Bar, Rectangle, ReferenceArea, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import {formatters, parsers, titles} from "./CameraData";
import { scaleSymlog } from 'd3-scale';
const customLogScale = scaleSymlog();

// https://coolors.co/palette/8ecae6-219ebc-023047-ffb703-fb8500
const ColorPalette = [
  "#8ECAE6",
  "#219EBC",
  "#023047",
  "#FFB703",
  "#FB8500"
];

const ScoreColorPalette = [
    "#003f5c",
    "#58508d",
    "#bc5090",
    "#ff6361",
    "#ffa600"
];

export function GetFormattedData(data, dataKey)
{
  let valueCounts = new Map();
  const defaultFormatter = (s) => s;
  const formatterForField = formatters[dataKey] || defaultFormatter;
  for(const d of data)
  {
    // TODO: Drop null? Is this the right place?
    if (d[dataKey] === null)
    {
      continue;
    }
    let key = formatterForField(d[dataKey]);
    let existingEntry = valueCounts.get(key);
    let count = existingEntry === undefined ? 1 : existingEntry.count + 1;
    valueCounts.set(key, {value: d[dataKey], count});
  }
  const defaultParser = (s) => {
    return s;
  }
  if (dataKey in parsers && dataKey in formatters)
  {
    // ERROR!! Somehow?
  }
  const parserForField = parsers[dataKey] || defaultParser;
  // we don't do this yet because numeric filters don't
  // support backwards ranges
  const invSort = false; // dataKey === "shutter_speed_value";
  if (dataKey in formatters)
  {
    // assume the field is natively numeric, and we want to change the labels
    // TODO: a null value, gets sorted ... where? How are we really handling null?
    const formatter = formatters[dataKey];
    const formattedData = [...valueCounts.entries()].map( (kv, index) => { 
      return {"name": kv[0], "value": parserForField(kv[1].value), "count": kv[1].count,"fill": ColorPalette[ index % ColorPalette.length]};
    }).toSorted( (a,b) => invSort ? b.value - a.value : a.value - b.value );
    return formattedData;
  }
  else
  {
    // TODO: a null value, gets sorted ... where? How are we really handling null?
    const formattedData = [...valueCounts.entries()].map( (kv, index) => { 
      return {"name": kv[0], "value": parserForField(kv[1].value), "count": kv[1].count,"fill": ColorPalette[ index % ColorPalette.length]};
    }).toSorted( (a,b) => invSort ? b.value - a.value : a.value - b.value  );
    return formattedData;
  }
}

// TODO: Make API for the graphs match? Data is currently not compatible
export function PieGraph({data, dataKey, color})
{
  const formattedData = GetFormattedData(data, dataKey);
  const maxValueLength = formattedData.reduce(
      (acc, currentValue) => Math.max(acc, currentValue.name.length),
      0
  );
  const legendLayout = maxValueLength > 10 ? "vertical" : "horizontal";
  return <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={formattedData} dataKey="count" nameKey="name" label />
      {(formattedData.length) < 6 && <Legend layout={legendLayout}/>}
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
}

// TODO: Make API for the graphs match? Data is currently not compatible
export function BarGraphForDialog({data, dataKey, color, highlightBounds})
{
  const formattedData = GetFormattedData(data, dataKey);
  let categoryBounds = undefined;
  let lineBetweenCategories = undefined;
  if (highlightBounds !== undefined)
  {
    const values = formattedData.map(x => x.value);
    const valuesInRange = values.map( v => v >= highlightBounds[0] && v <= highlightBounds[1]);
    const indexGT = valuesInRange.indexOf(true);
    const indexLT = valuesInRange.lastIndexOf(true);
    // could have more checks on these
    if(indexGT !== -1 && indexLT !== -1)
    {
      categoryBounds = [values[indexGT], values[indexLT]];
    }
    else
    {
      // none of our categories satisfy our bars, but there's some awkward cases here

      // paranoid check, shouldn't get here but let's not do math in this case
      if (values.length !== 0)
      {
        // our first category is too *high* for our range
        if (values[0] > highlightBounds[1])
        {
          lineBetweenCategories = {
            x: values[0],
            position: "start"
          };
        }
        // our second category is too *low* for our range
        else if(values[values.length - 1] < highlightBounds[0])
        {
          // note: that we don't really need this case, but it feels nicely symmetric
          lineBetweenCategories = {
            x: values[values.length - 1],
            position: "end"
          };
        }
        else
        {
          // we know that our filterRange is between some bin,
          // so we look for the first element > than our bounds
          const valuesThatAreLowerThanOurRange = values.map( v => v >= highlightBounds[0] && v >= highlightBounds[1]);
          const indexLast = valuesThatAreLowerThanOurRange.indexOf(true);
          if (indexLast === -1)
          {
            // this is off the right-end of the graph ... this should never now
          }
          else
          {
            lineBetweenCategories = {
              x: values[indexLast],
              position: "start"
            }
          }
        }
      }
    }
  }
  const title = titles[dataKey] || dataKey;
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart
        data={formattedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 25,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name">
          <Label
            value={title} 
            dy={20}
          />
        </XAxis>
        <YAxis />
        <Tooltip 
          labelFormatter={labelFormatters[dataKey]}
          labelStyle={{color}}
        />
        {categoryBounds !== undefined &&
          <ReferenceArea
            x1={categoryBounds[0]}
            x2={categoryBounds[1]}
          />
        }
        {
          lineBetweenCategories !== undefined &&
          <ReferenceLine
            x={lineBetweenCategories.x}
            position={lineBetweenCategories.position}
          />
        }
        <Bar dataKey="count" fill={color} activeBar={<Rectangle fill="pink" stroke="blue" />} />
      </BarChart>
    </ResponsiveContainer>
}

export const labelFormatters = {
  "iso_speed_rating" : (val) => {
    const title = titles["iso_speed_rating"];
    if (val === null || val === undefined || val === '')
    {
      return `${title} Unknown`;

    }
    else
    {
      return `${title} ${val}`;
    }
  },
  "aperture_value": (val) => {
    const title = titles["aperture_value"];
    if (val === null || val === undefined || val === '')
    {
      return `${title} Unknown`;

    }
    else
    {
      return `${title} ƒ/${val}`;
    }
  },
  "shutter_speed_value": (val) => {
    const title = titles["shutter_speed_value"];
    if (val === null || val === undefined || val === '')
    {
      return `${title} ${val}`;
    }
    else
    {
      return `${title} ${val}`;
    }
  }
};

// TODO: Make API for the graphs match? Data is currently not compatible
export function BarGraph({data, dataKey, color, logMode, freqMode, ratingMode})
{
  const title = titles[dataKey] || dataKey;
  const percentFormatter = (value, name, props) => {
    // the formatter trims our string so this padStart doesn't work!
    return value.toFixed(0) + "%"; // .padStart(6, ' ');
  };
  /*
    // Investigating logarithmic X, I found
    // these components useful
    // 
    <BarChart
      data={data.filter(group => group.value !== null)}

    />
      <XAxis dataKey="value" type="number" scale="log" domain={['dataMin', 'dataMax']}>

  */
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={data}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 25,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name">
        <Label
            value={title} 
            dy={20}
        />
      </XAxis>
      <YAxis scale={logMode ? customLogScale : undefined}/>
      <Tooltip  
        labelFormatter={labelFormatters[dataKey]}
        labelStyle={{color}}
      />
      {(ratingMode === undefined || ratingMode === null) && 
        <Bar
          stackId="a"
          dataKey={"count"}
          name={"Images"}
          fill={color}
          activeBar={<Rectangle fill="pink" stroke="blue" />}
        />
      }
      {ratingMode !== null && ratingMode !== undefined && ratingMode.map((r,index) => <Bar
        stackId="a"
        dataKey={ freqMode ? `ratingFreqs.${r}` : `ratingCounts.${r}`}
        fill={ScoreColorPalette[ (4-index) % ScoreColorPalette.length]}
        activeBar={<Rectangle fill="blue" stroke="blue" />}
        name={`rating=${r}`}
      />)}
      {ratingMode !== null && ratingMode !== undefined && 
        <Legend 
          wrapperStyle={{ bottom: 5}}
        />
      }
    </BarChart>
  </ResponsiveContainer>
}