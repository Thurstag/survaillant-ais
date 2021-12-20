/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import * as tf from "@tensorflow/tfjs";
import { LAYERS_COUNT as INPUT_LAYERS_COUNT } from "../common/states.js";
import { SurvaillantTrainingNetwork, SurvaillantFinalNetwork } from "../common/network.js";
import keras from "../common/tensorflow/keras.js";


const POLICY_NETWORK_NAME = "dqnPolicy";

class DQNFinalNetwork extends SurvaillantFinalNetwork {
    #network;

    /**
     * Constructor
     *
     * @param {tf.LayersModel} network Policy network
     */
    constructor(network) {
        super();
        this.#network = network;
    }

    predict(inputs) {
        return tf.softmax(this.#network.predict(inputs)).argMax(-1);
    }
}
/**
 * 
 */
class DQNTrainingNetwork extends SurvaillantTrainingNetwork {

    /**
     * Constructor
     *
     * @param {tf.LayersModel} policy Policy network
     * @param {tf.Optimizer} policyOpt Policy optimizer
     */
    constructor(policy, policyOpt) {
        const modelByName = {};

        modelByName[POLICY_NETWORK_NAME] = { network: policy, optimizer: policyOpt };

        super(modelByName);
    }

    network() {
        return super.network(POLICY_NETWORK_NAME);
    }

    predict(state) {
        return this.network().predict(state);
    }

    setWeights(weights) {
        return this.network().setWeights(weights);
    }

    getWeights() {
        return this.network().getWeights();
    }
}

function modelGenerator(height, width) {
    const model = tf.sequential();
    model.add(keras.conv2d({
        filters: 128,
        kernelSize: 3,
        strides: 1,
        activation: "relu",
        inputShape: [ height, width, INPUT_LAYERS_COUNT ]
    }));
    model.add(tf.layers.batchNormalization());
    model.add(keras.conv2d({
        filters: 256,
        kernelSize: 3,
        strides: 1,
        activation: "relu"
    }));
    model.add(tf.layers.batchNormalization());
    model.add(keras.conv2d({
        filters: 256,
        kernelSize: 3,
        strides: 1,
        activation: "relu"
    }));
    model.add(tf.layers.flatten());
    model.add(keras.dense({ units: 100, activation: "relu" }));
    model.add(tf.layers.dropout({ rate: 0.25 }));
    model.add(keras.dense({ units: SurvaillantTrainingNetwork.ACTIONS_COUNT }));

    return model;
}

/**
 * Create a training PPO network with existing networks
 *
 * @param {int} height
 * @param {int} width
 * @param {number} policyLearningRate Policy network learning rate with Adam optimizer
 * @return {Promise<PpoTrainingNetwork>} Network
 */
function fromZero(height, width, policyLearningRate = 0.00025) {
    return new DQNTrainingNetwork(
        modelGenerator(height, width),
        keras.adam(policyLearningRate)
    );
}

/**
 * Create a final DQN network based on its policy network
 *
 * @param {String} policy Path to the file defining the policy network
 * @return {Promise<PpoFinalNetwork>} Network
 */
async function fromNetwork(policy) {
    return new DQNFinalNetwork(await tf.loadLayersModel(policy));
}

export { fromZero, fromNetwork };
