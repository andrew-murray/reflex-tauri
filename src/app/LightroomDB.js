
const directSelect = (db, table, columns, limit, offset, orderBy) => {
  if (!db)
  {
    throw Error("db was not provided/was not ready");
  }
  const col_join = columns === "*" ? "*" : columns.join(",");
  const slim = limit ? ` LIMIT ${limit}` : "";
  const soffset = offset ? ` OFFSET ${offset}`: "";
  const ob = orderBy ? ` ORDER BY ${orderBy}` : "";
  const qs = `SELECT ${col_join} FROM ${table}${ob}${slim}${soffset};`
  return db.exec(qs);
};

const genericSelect = (db, table, columns, limit, offset, orderBy) => {
  const qresult = directSelect(db, table, columns, limit, offset, orderBy);
  const res_columns = qresult[0].columns;
  return qresult[0].values.map( row => Object.fromEntries(
    res_columns.keys().map( i => [res_columns[i], row[i]])
  ));
};

// there are a bunch of databases,
// these queries are all on the catalogue *.cat

export const catalogue = { 
  "queries": {
    select: {
      images: (db)=>{
        return genericSelect(
          db,
          "Adobe_images",
          ["id_local", "id_global", "aspectRatioCache", "captureTime"],
          20 // limit
        );
      },
      imageMetadata: (db) => {
        return genericSelect(
          db,
          "AgHarvestedExifMetadata",
          // I'm not super sure how the ids match other fields
          [
            "id_local",
            "image", // presumably a link to the image id_local
            "cameraModelRef", // links to id_local, in the camera field
            "lensRef", // links to id_local, in the lens field
            "aperture",
            "flashFired",
            "focalLength",
            "isoSpeedRating",
            "shutterSpeed" // not clear on the units for this
          ],
          20 // limit
        );
      },
      cameras: (db) => {
        return genericSelect(
          db,
          "AgInternedExifCameraModel",
          [
            "id_local", 
            // "searchIndex", // looks quite implementationy and not useful
            "value"
          ]
        );
      },
      lenses: (db) => {
        return genericSelect(
          db,
          "AgInternedExifLens",
          [
            "id_local", 
            // "searchIndex", // looks quite implementationy and not useful
            "value"
          ]
        );
      },
      libraries: (db) => {
        return genericSelect(
          db,
          "AgLibraryRootFolder",
          [
            "id_local",
            "name",
            "absolutePath"
          ]
        );
      },
      libraryImports: (db) => { // seems to record a reference to the library, and imports it did
        return genericSelect(
          db,
          "AgLibraryImport",
          [
            "id_local",
            "importDate"
          ]
        );
      },
      libraryImageImports: (db) => { // cross ref of image/import - may be worth corresponding images to imports, probably not the best output format
        return genericSelect(
          db,
          "AgLibraryImportImage",
          [
            // "id_local", // just an id, for the relation number
            "image", // believe to be image.id_local 
            "import" // believed to be libraryImportDates.id_local
          ],
          20 // limit
        );
      },
      files: (db) => { // cross ref of image/import - may be worth corresponding images to imports, probably not the best output format
        return genericSelect(
          db,
          "AgLibraryFile",
          [
            "id_local",  // corresponding to image? maybe?
            "id_global", // corresponding to image? maybe?
            "folder", // id corresponding to libraries
            "idx_filename", // believed to be libraryImportDates.id_local
            // "original_filename" // which filename should we use?
            "modTime" // seconds since epoch, I reckon
          ],
          20 // limit
        );
      }
    }
  }
};

// the metadata catalogue looks to have everything I'd want
// but often ... as a string (losing any of the relational structure we get, from querying the other databases)
// but ... life will be so much easier if we just live in that DB

export const metadata = {
  "queries": {
    "select": {
      "images": (db, limit, offset, orderby) => {
        return genericSelect(
          db, 
          "AgImagesMetadata",
          [
            "imageid",
            "com_adobe_absoluteFilepath",
            "com_adobe_folder", // this is like the collection, in adobe
            "com_adobe_rating", // float!
            "com_adobe_imageFileDimensions", // stringy "3648 x 6472"
            "com_adobe_imageCroppedDimensions",  // stringy "3648 x 6472"
            "com_adobe_model", // camera
            "com_adobe_lens", // lens
            "com_adobe_shutterSpeedValue",
            "com_adobe_apertureValue",
            "com_adobe_focalLength",
            "com_adobe_lens",
            "com_adobe_ISOSpeedRating",
            "com_adobe_exposureProgram",
            "com_adobe_meteringMode",
            "com_adobe_flash",
            "com_adobe_dateTime"
          ],
          limit,
          offset,
          orderby
        )
      }
    }
  }
};

export const preview = {
  "queries": {
    "select": {
      "cache": (db, limit, offset) => {
        return genericSelect(
          db, 
          "ImageCacheEntry",
          [
            "imageId",
            // "uuid", // we won't use this entry
            // "digest", // we won't use this entry
            "orientation"
          ],
          limit,
          offset
        )
      }
    }
  }
};