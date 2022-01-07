/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import fs from "fs";

const AUTO_ARGUMENT_VALUE = "auto";

/**
 * Check that path is a valid path to a filesystem entry
 *
 * @param {string} path Path
 * @return {String} The given path
 */
function path(path) {
    if (!fs.existsSync(path)) {
        throw Error(`${path} doesn't exist`);
    }

    return path;
}

/**
 * Create a function that splits its argument with ',' character and apply the given mapper on each element
 *
 * @param {function(String):*} mapper Mapper to use
 * @return {function(String): *[]} Function
 */
function array(mapper) {
    return (arg) =>
        arg.split(",").map((e) => mapper(e));
}

/**
 * Create a function that checks if its argument is {@link AUTO_ARGUMENT_VALUE} or a valid argument according to checker
 *
 * @param {function(String):*} checker Function that throws an error if its argument isn't valid, otherwise returns it
 * @return {function(String):*} Function
 */
function autoOr(checker) {
    return (arg) => arg === AUTO_ARGUMENT_VALUE ? arg : checker(arg);
}

const parser = new ArgumentParser();
const int = parser._registries.type.int;

export { path, array, int, autoOr, AUTO_ARGUMENT_VALUE };
