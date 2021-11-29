/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";

const BACKEND = {
    NONE: "NONE",
    CPU: "CPU",
    GPU: "GPU"
};

/**
 * Load tensorflow backend module
 *
 * @param {String} backend Backend to load (one of {@link BACKEND})
 * @return {*} Module
 */
async function load(backend) {
    if (backend === BACKEND.NONE) {
        return tf;
    }

    return (backend === BACKEND.GPU ? import("./node-gpu.js") : import("./node.js"));
}

export { BACKEND, load };
