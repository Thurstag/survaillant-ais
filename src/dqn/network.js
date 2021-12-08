/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import * as tf from "@tensorflow/tfjs";
import { LAYERS_COUNT as INPUT_LAYERS_COUNT } from "../common/states.js";

/**
 * TODO
 * 
 * @param {*} height 
 * @param {*} width 
 * @param {*} actions 
 */
export function createSurvaillantDeepQNetwork(height, width) {

    const model = tf.sequential();
    model.add(tf.layers.conv2d({
        filters: 128,
        kernelSize: 3,
        strides: 1,
        activation: "relu",
        inputShape: [ height, width, INPUT_LAYERS_COUNT ]
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.conv2d({
        filters: 256,
        kernelSize: 3,
        strides: 1,
        activation: "relu"
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.conv2d({
        filters: 256,
        kernelSize: 3,
        strides: 1,
        activation: "relu"
    }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 100, activation: "relu" }));
    model.add(tf.layers.dropout({ rate: 0.25 }));
    model.add(tf.layers.dense({ units: 4 }));

    return model;
}