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

export default { adam, dense };
