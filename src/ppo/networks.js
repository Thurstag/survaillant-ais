/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import { SurvaillantFinalNetwork, SurvaillantTrainingNetwork } from "../common/network.js";
import keras from "../common/tensorflow/keras.js";
import { PpoDefaultHyperparameter as DefaultHyperparameter } from "./hyperparameters.js";

const POLICY_NETWORK_NAME = "policy";
const VALUE_NETWORK_NAME = "value";

/**
 * Final version of a network based on Proximal Policy Optimization model (it doesn't contain the value network)
 */
class PpoFinalNetwork extends SurvaillantFinalNetwork {
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
 * Training version of a network based on Proximal Policy Optimization model.
 * Value network returns a scalar and policy network returns a 1D tensor with 4 values.
 */
class PpoTrainingNetwork extends SurvaillantTrainingNetwork {
    /** Number of outputs for value network */
    static VALUE_OUTPUTS_COUNT = 1;

    /**
     * Constructor
     *
     * @param {tf.LayersModel} policy Policy network
     * @param {tf.LayersModel} value Value network
     * @param {tf.Optimizer} policyOpt Policy optimizer
     * @param {tf.Optimizer} valueOpt Value optimizer
     */
    constructor(policy, value, policyOpt, valueOpt) {
        const modelByName = {};
        modelByName[POLICY_NETWORK_NAME] = { network: policy, optimizer: policyOpt };
        modelByName[VALUE_NETWORK_NAME] = { network: value, optimizer: valueOpt };

        super(modelByName);
    }

    /**
     * Generate output predictions of policy and value networks for the given batch of inputs
     *
     * @param {Tensor} inputs Batch of inputs
     * @return {Tensor[]} Predictions of policy and value networks
     */
    predict(inputs) {
        return [ this.actions(inputs), this.value(inputs) ];
    }

    /**
     * Generate output predictions of policy network for the given batch of inputs
     *
     * @param {Tensor} inputs Batch of inputs
     * @return {Tensor} Predictions
     */
    actions(inputs) {
        return this.network(POLICY_NETWORK_NAME).predict(inputs);
    }

    /**
     * Generate output predictions of value network for the given batch of inputs
     *
     * @param {Tensor} inputs Batch of inputs
     * @return {Tensor} Predictions
     */
    value(inputs) {
        return this.network(VALUE_NETWORK_NAME).predict(inputs);
    }

    /**
     * Train policy network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainPolicy(loss) {
        this.train(POLICY_NETWORK_NAME, loss);
    }

    /**
     * Train value network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainValue(loss) {
        this.train(VALUE_NETWORK_NAME, loss);
    }
}

/**
 * Create a training PPO network with random weights
 *
 * @param {number} x Input dimension on first axis
 * @param {number} y Input dimension on second axis
 * @param {number} z Input dimension on third axis
 * @param {number[]} units Units of hidden layers
 * @param {number} policyLearningRate Policy network learning rate with Adam optimizer
 * @param {number} valueLearningRate Value network learning rate with Adam optimizer
 * @return {PpoTrainingNetwork} Network
 */
function random(x, y, z, units = DefaultHyperparameter.HIDDEN_LAYER_UNITS, policyLearningRate = DefaultHyperparameter.POLICY_LEARNING_RATE, valueLearningRate = DefaultHyperparameter.VALUE_LEARNING_RATE) {
    const input = tf.input({ shape: [ x, y, z ] });
    const flattenInput = tf.layers.flatten().apply(input);

    return new PpoTrainingNetwork(
        tf.model({ inputs: [ input ], outputs: [ keras.feedforward(units.concat([ SurvaillantTrainingNetwork.ACTIONS_COUNT ]), flattenInput, "tanh") ] }),
        tf.model({ inputs: [ input ], outputs: [ keras.feedforward(units.concat([ PpoTrainingNetwork.VALUE_OUTPUTS_COUNT ]), flattenInput, "tanh") ] }),
        keras.adam(policyLearningRate),
        keras.adam(valueLearningRate)
    );
}

/**
 * Create a training PPO network with existing networks
 *
 * @param {String} policy Path to the file defining the policy network
 * @param {String} value Path to the file defining the value network
 * @param {number} policyLearningRate Policy network learning rate with Adam optimizer
 * @param {number} valueLearningRate Value network learning rate with Adam optimizer
 * @return {Promise<PpoTrainingNetwork>} Network
 */
async function fromNetworks(policy, value, policyLearningRate = DefaultHyperparameter.POLICY_LEARNING_RATE, valueLearningRate = DefaultHyperparameter.VALUE_LEARNING_RATE) {
    return new PpoTrainingNetwork(
        await tf.loadLayersModel(policy),
        await tf.loadLayersModel(value),
        keras.adam(policyLearningRate),
        keras.adam(valueLearningRate)
    );
}

/**
 * Create a final PPO network based on its policy network
 *
 * @param {String} policy Path to the file defining the policy network
 * @return {Promise<PpoFinalNetwork>} Network
 */
async function fromNetwork(policy) {
    return new PpoFinalNetwork(await tf.loadLayersModel(policy));
}

export { random, fromNetworks, fromNetwork, POLICY_NETWORK_NAME, VALUE_NETWORK_NAME };
