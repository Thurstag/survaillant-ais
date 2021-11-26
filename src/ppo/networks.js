/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import SurvaillantNetwork from "../common/network.js";
import keras from "../common/tensorflow/keras.js";

const ACTOR_NAME = "actor";
const CRITIC_NAME = "critic";

/**
 * Training version of a network based on Proximal Policy Optimization model.
 * Critic network returns a scalar and actor network returns a 1D tensor with 4 values.
 */
class PpoTrainingNetwork extends SurvaillantNetwork {
    /**
     * Constructor
     *
     * @param {tf.LayersModel} actor Actor network
     * @param {tf.LayersModel} critic Critic network
     * @param {tf.Optimizer} actorOpt Actor optimizer
     * @param {tf.Optimizer} criticOpt Critic optimizer
     */
    constructor(actor, critic, actorOpt, criticOpt) {
        const modelByName = {};
        modelByName[ACTOR_NAME] = { network: actor, optimizer: actorOpt };
        modelByName[CRITIC_NAME] = { network: critic, optimizer: criticOpt };

        super(modelByName);
    }

    /**
     * Generate output predictions of actor and critic networks for the given batch of inputs
     *
     * @param inputs Batch of inputs
     * @return {Tensor[]} Predictions of actor and critic networks
     */
    predict(inputs) {
        return [ this.actions(inputs), this.critic(inputs) ];
    }

    /**
     * Generate output predictions of actor network for the given batch of inputs
     *
     * @param inputs Batch of inputs
     * @return {Tensor} Predictions
     */
    actions(inputs) {
        return this.network(ACTOR_NAME).predict(inputs);
    }

    /**
     * Generate output predictions of critic network for the given batch of inputs
     *
     * @param inputs Batch of inputs
     * @return {Tensor} Predictions
     */
    critic(inputs) {
        return this.network(CRITIC_NAME).predict(inputs);
    }

    /**
     * Train actor network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainActor(loss) {
        this.train(ACTOR_NAME, loss);
    }

    /**
     * Train critic network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainCritic(loss) {
        this.train(CRITIC_NAME, loss);
    }

    /**
     * Number of outputs for critic network
     *
     * @return {number} Number of outputs
     */
    static get CRITIC_OUTPUTS_COUNT() {
        return 1;
    }
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
        input = keras.dense({ units: units[i], activation: intermediateActivation }).apply(input);
    }

    return keras.dense({ units: units[units.length - 1] }).apply(input);
}

/**
 * Create a training PPO network with random weights
 *
 * @param {number} x Input dimension on first axis
 * @param {number} y Input dimension on second axis
 * @param {number} z Input dimension on third axis
 * @param {number[]} units Units of hidden layers
 * @param {number} actorLearningRate Actor network learning rate with Adam optimizer
 * @param {number} criticLearningRate Critic network learning rate with Adam optimizer
 * @return {PpoTrainingNetwork} Network
 */
function random(x, y, z, units, actorLearningRate, criticLearningRate) {
    const input = tf.input({ shape: [ x, y, z ] });
    const flattenInput = tf.layers.flatten().apply(input);

    return new PpoTrainingNetwork(
        tf.model({ inputs: [ input ], outputs: [ feedforward(units.concat([ SurvaillantNetwork.ACTIONS_COUNT ]), flattenInput, "tanh") ] }),
        tf.model({ inputs: [ input ], outputs: [ feedforward(units.concat([ PpoTrainingNetwork.CRITIC_OUTPUTS_COUNT ]), flattenInput, "tanh") ] }),
        keras.adam(actorLearningRate),
        keras.adam(criticLearningRate)
    );
}

export { random };
