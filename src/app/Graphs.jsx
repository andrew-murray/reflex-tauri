import { BarChart, PieChart, Pie, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import {parsers, titles} from "./CameraData";
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
  for(const d of data)
  {
    valueCounts.set(d[dataKey], (valueCounts.get(d[dataKey]) || 0) + 1);
  }
  const defaultParser = (s) => {
    return s;
  }
  const parserForField = parsers[dataKey] || defaultParser;
  // TODO: a null value, gets sorted ... where? How are we really handling null?
  const formattedData = [...valueCounts.entries()].map( (kv, index) => { 
    return {"name": kv[0], "value": parserForField(kv[0]), "count": kv[1],"fill": ColorPalette[ index % ColorPalette.length]};
  }).toSorted( (a,b) => a.value - b.value );
  return formattedData;
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
export function BarGraphForDialog({data, dataKey, color})
{
  const formattedData = GetFormattedData(data, dataKey);
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
        <Tooltip />
        <Bar dataKey="count" fill={color} activeBar={<Rectangle fill="pink" stroke="blue" />} />
      </BarChart>
    </ResponsiveContainer>
}

// TODO: Make API for the graphs match? Data is currently not compatible
export function BarGraph({data, dataKey, color, logMode, freqMode, ratingMode})
{
  const title = titles[dataKey] || dataKey;
  const floatFormatter = (value, name, props) => {
    // the formatter trims our string so this padStart doesn't work!
    return value.toFixed(0) + "%"; // .padStart(6, ' ');
  };
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
      <YAxis scale={logMode ? customLogScale : "auto"}/>
      <Tooltip 
        formatter={(ratingMode && freqMode) ? floatFormatter : undefined}
      />
      {(ratingMode === undefined || ratingMode === null) && 
        <Bar stackId="a" dataKey={"count"} fill={color} activeBar={<Rectangle fill="pink" stroke="blue" />} />
      }
      {ratingMode !== null && ratingMode !== undefined && ratingMode.map((r,index) => <Bar
        stackId="a"
        dataKey={ freqMode ? `ratingFreqs.${r}` : `ratingCounts.${r}`} fill={ScoreColorPalette[ (4-index) % ScoreColorPalette.length]} activeBar={<Rectangle fill="blue" stroke="blue" />}
        name={`rating=${r}`}
      />)}
      {ratingMode !== null && ratingMode !== undefined && 
        <Legend />
      }
    </BarChart>
  </ResponsiveContainer>
}