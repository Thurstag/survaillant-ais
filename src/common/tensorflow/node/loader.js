/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

/**
 * Load tensorflow backend module
 *
 * @param gpu Load the GPU version of the backend or not
 * @return {*} Module
 */
async function load(gpu) {
    return (gpu ? import("./node-gpu.js") : import("./node.js"));
}

export default load;
