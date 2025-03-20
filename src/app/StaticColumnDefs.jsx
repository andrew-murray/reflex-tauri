import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { invoke } from "@tauri-apps/api/core";

// todo: to see the consequences of this, I'll need to make StaticColumnDefs a factory
// so that the image-state can pass out
async function invoke_load(image_id) {
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// setGreetMsg(await invoke("get_image_for_id", {}));
    await invoke("get_image_for_id", {imageId: image_id.toString()});
};

const StaticColumnDefs = [ 
    {
        accessorKey:"com_adobe_absoluteFilepath",
        header: "Path",
        filterable: false,
        plottable: false,
        cell: ({cell, row}) => {
            console.log("clicked");
            console.log(row.original);
            const path = row.original["com_adobe_absoluteFilepath"];
            const image_id = row.original["imageid"];
            // fixme: tooltip just doesn't cut it, I can't customise it in the way I want
            // but https://mui.com/material-ui/react-popover/ 
            // is what I want ... but it probably needs a custom component in its own file, see OnHoverImage.jsx
            return <Button onClick={()=>{invoke_load(image_id);}}>
                <Typography>
                    {path}
                </Typography>
            </Button>
        }
    },
    {
        accessorKey:"com_adobe_folder",
        header: "Folder",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_rating",
        header: "Rating",
        cell: ({ cell, row }) => {
            const ratingVal = row.original["com_adobe_rating"];
            // note that: it's quite hard to see the "disabled" rating in action
            // There are some on page-13 of my normal manual-test-data (if page-size=50)
            // In folder "20230923 Walk about Town - Wabi Sabi"
            return <Rating
                value={ ratingVal === "" ? 0 : ratingVal}
                readOnly
                disabled={ratingVal === "" ? true : undefined}
            />
        },
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_imageFileDimensions",
        header: "Raw Dims",
        filterable: false,
        plottable: false
    },
    {
        accessorKey:"com_adobe_imageCroppedDimensions",
        header: "Crop Dims",
        filterable: false,
        plottable: false
    },
    {
        accessorKey:"com_adobe_model",
        header: "Camera",
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_lens",
        header: "Lens",
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_shutterSpeedValue",
        header: "Shutter Speed",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_apertureValue",
        header: "Aperture",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_focalLength",
        header: "Focal Length",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_ISOSpeedRating",
        header: "ISO",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_exposureProgram",
        header: "Exp. Program",
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_meteringMode",
        header: "Metering",
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_flash",
        header: "Flash",
        filterable: true,
        plottable: true
    },
    {
        accessorKey:"com_adobe_dateTime",
        header: "Date/Time",
        filterable: false,
        plottable: false
    }
];

export default StaticColumnDefs;