/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs";

/**
 * Check that path is a valid path to a filesystem entry
 *
 * @param path Path
 * @return {String} The given path
 */
function path(path) {
    if (!fs.existsSync(path)) {
        throw Error(`${path} doesn't exist`);
    }

    return path;
}

/**
 * Create a function that split its argument with ',' character and apply the given mapper on each element
 *
 * @param {function(*):*} mapper Mapper to use
 * @return {function(String): *[]} Function
 */
function array(mapper) {
    return (arg) =>
        arg.split(",").map((e) => mapper(e));
}

export { path, array };
