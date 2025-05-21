import { invoke } from "@tauri-apps/api/core";

// todo: to see the consequences of this, I'll need to make StaticColumnDefs a factory
// so that the image-state can pass out
async function invoke_load(image_id) {
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// setGreetMsg(await invoke("get_image_for_id", {}));
    await invoke("get_image_for_id", {imageId: image_id.toString()});
};

    /*{
        // accessorKey:"com_adobe_rating",
        accessorKey:"com_adobe_rating",
        header: "Rating",
        filterable: true,
        plottable: true
    },*/

const StaticColumnDefs = [ 
    {
        // accessorKey:"com_adobe_absoluteFilepath",
        accessorKey: "filename",
        header: "Path",
        filterable: false,
        plottable: false
    },
    {
        // accessorKey:"com_adobe_folder",
        accessorKey: "folder",
        header: "Folder",
        filterable: false,
        plottable: true
    },
    {
        accessorKey:"com_adobe_rating",
        header: "Rating",
        filterable: true,
        plottable: true,
        optional: true
    },
    {
        // accessorKey:"com_adobe_dateTime",
        accessorKey:"datetime_original",
        header: "Date/Time",
        filterable: false,
        plottable: false
    },
    {
        // accessorKey:"com_adobe_model",
        accessorKey:"model",
        header: "Camera",
        filterable: true,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_lens",
        accessorKey:"lens_model",
        header: "Lens",
        filterable: true,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_shutterSpeedValue",
        accessorKey:"shutter_speed_value",
        header: "Shutter Speed",
        filterable: false,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_apertureValue",
        accessorKey:"aperture_value",
        header: "Aperture",
        filterable: false,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_focalLength",
        accessorKey:"focal_length",
        header: "Focal Length",
        filterable: false,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_ISOSpeedRating",
        accessorKey:"iso_speed_rating",
        header: "ISO",
        filterable: false,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_exposureProgram",
        accessorKey:"exposure_program",
        header: "Exp. Program",
        filterable: true,
        plottable: true
    },
    {
        // accessorKey:"com_adobe_meteringMode",
        accessorKey:"metering_mode",
        header: "Metering",
        filterable: true,
        plottable: true
    }
    // flash is really messy the strings are horrendously complicated, let's remove it for now
    // as *I* don't care
    // {
    //     // accessorKey:"com_adobe_flash",
    //     accessorKey:"flash",
    //     header: "Flash",
    //     filterable: true,
    //     plottable: true
    // }
    // the feature set for these columns is too limited/poor that I think it's better to remove them
    // {
    //     accessorKey:"com_adobe_imageFileDimensions",
    //     header: "Raw Dims",
    //     filterable: false,
    //     plottable: false
    // },
    // {
    //     accessorKey:"com_adobe_imageCroppedDimensions",
    //     header: "Crop Dims",
    //     filterable: false,
    //     plottable: false
    // },
];

export default StaticColumnDefs;