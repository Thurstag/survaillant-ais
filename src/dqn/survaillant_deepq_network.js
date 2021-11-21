/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * TODO
 * 
 * @param {*} height 
 * @param {*} width 
 * @param {*} actions 
 */
export function createSurvaillantDeepQNetwork(height, width, actions) {

    const inputs = tf.input({shape: [1, height, width, 2]});

    const layer1 = tf.layers.conv2d({
        filters: 32,
        kernelSize: 8,
        strides: 4,
        activation: 'relu',
    }).apply(inputs);

    const layer2 = tf.layers.conv2d({
        filters: 64,
        kernelSize: 4,
        strides: 2,
        activation: 'relu',
    }).apply(layer1);

    const layer3 = tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        strides: 1,
        activation: 'relu',
    }).apply(layer2);

    const flattenLayer = tf.layers.flatten().apply(layer3);

    const denseLayer = tf.layers.dense({units: 512, activation: 'relu'}).apply(flattenLayer);
    const output = tf.layers.dense({units: actions, activation: 'linear'}).apply(denseLayer);

    return tf.model({inputs: inputs, outputs: output});
}