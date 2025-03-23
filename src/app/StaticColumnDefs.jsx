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
        plottable: false
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