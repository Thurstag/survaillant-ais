/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";

/**
 * Create a Adam optimizer
 *
 * @param {number} learningRate The learning rate to use for the Adam gradient descent algorithm
 * @param {number} beta1 The exponential decay rate for the 1st moment estimates
 * @param {number} beta2 The exponential decay rate for the 2nd moment estimates
 * @param {number} epsilon A small constant for numerical stability
 * @return {tf.AdamOptimizer} Optimizer
 */
function adam(learningRate, beta1 = 0.9, beta2 = 0.999, epsilon = 1E-07) {
    return tf.train.adam(learningRate, beta1, beta2, epsilon);
}

/**
 * Create a dense (fully connected) layer
 *
 * @param {DenseLayerArgs} args Layer's arguments
 * @return {Layer} Layer
 */
function dense(args) {
    return tf.layers.dense({ ...{ useBias: true, kernelInitializer: "glorotUniform", biasInitializer: "zeros" }, ...args });
}

/**
 * Create a 2D convolution layer
 *
 * @param {ConvLayerArgs} args Layer's arguments
 * @return {Layer} Layer
 */
function conv2d(args) {
    return tf.layers.conv2d({ ...{ strides: [ 1, 1 ], padding: "valid", dilationRate: [ 1, 1 ], kernelInitializer: "glorotUniform", biasInitializer: "zeros" }, ...args });
}

/**
 * Create layers representing a feedforward network containing 'units.length' layers
 *
 * @param {number[]} units Unit for each layer
 * @param {Tensor} input Network's input
 * @param {string} intermediateActivation Activation function to use for layers except the last one
 * @return {Tensor} Output layer
 */
function feedforward(units, input, intermediateActivation) {
    for (let i = 0; i < units.length - 1; i++) {
        input = dense({ units: units[i], activation: intermediateActivation }).apply(input);
    }

    return dense({ units: units[units.length - 1] }).apply(input);
}

export default { adam, dense, conv2d, feedforward };
