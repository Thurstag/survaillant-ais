/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import { LAYERS_COUNT as INPUT_LAYERS_COUNT } from "../common/states.js";

// TODO: Doc
class CombinedAcNetwork {
    // TODO: Doc
    constructor(actorAndCritic, learningRate) {
        this._actorAndCritic = actorAndCritic;
        this._opt = tf.train.adam(learningRate);
    }

    // TODO: Doc
    predict(states) {
        return tf.tidy(() => {
            const statesAsBatch = tf.concat(states.map(tf.expandDims));

            return this._actorAndCritic.predict(statesAsBatch);
        });
    }

    // TODO: Doc
    update(lossFunc) {
        tf.tidy(() => {
            const criticGrads = tf.variableGrads(lossFunc);
            this._opt.applyGradients(criticGrads.grads);
        });
    }

    // TODO: Doc
    printSummary() {
        console.log("Actor & critic network:");
        this._actorAndCritic.summary();
    }
}

// TODO: Doc
function random(radius, hiddenLayerDim, learningRate) { // TODO: Create separated
    const mapDim = radius * 2 + 1;

    const createInput = () => tf.input({ shape: [ mapDim, mapDim, INPUT_LAYERS_COUNT ] });
    const createHiddenLayer = input => tf.layers.dense({ activation: "relu", units: hiddenLayerDim }).apply(input);
    const createActor = input => tf.layers.dense({ activation: "softmax", units: 4 }).apply(input); // TODO: Create a constant
    const createCritic = input => tf.layers.dense({ units: 1 }).apply(input);

    const input = createInput();
    const commonInput = tf.layers.flatten().apply(createHiddenLayer(input));
    const actor = createActor(commonInput);
    const critic = createCritic(commonInput);

    return new CombinedAcNetwork(
        tf.model({ inputs: [ input ], outputs: [ actor, critic ] }),
        learningRate
    );
}

export { random };
