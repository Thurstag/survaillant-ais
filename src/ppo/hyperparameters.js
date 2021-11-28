/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const PpoHyperparameters = {
    STEPS_PER_EPOCH: 4000,
    GAMMA: 0.99,
    CLIP_RATIO: 0.2,
    POLICY_LEARNING_RATE: 3E-4,
    VALUE_FUNCTION_LEARNING_RATE: 1E-3,
    TRAIN_POLICY_ITERATIONS: 80,
    TRAIN_VALUE_FUNCTION_ITERATIONS: 80,
    LAM: 0.97,
    TARGET_KL: 0.01,
    HIDDEN_LAYER_UNITS: [ 64, 64 ]
};


export default PpoHyperparameters;
