/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import { SurvaillantFinalNetwork, SurvaillantTrainingNetwork } from "../common/network.js";
import keras from "../common/tensorflow/keras.js";
import { DdpgDefaultHyperparameter as DefaultHyperparameter } from "./hyperparameters.js";

const ACTOR_NETWORK_NAME = "actor";
const CRITIC_NETWORK_NAME = "critic";

const CRITIC_ACTIVATION_FUNC = "selu";

/**
 * Final version of a network based on Deep Deterministic Policy Gradient model (it doesn't contain the critic network)
 */
class DdpgFinalNetwork extends SurvaillantFinalNetwork {
    #network;

    /**
     * Constructor
     *
     * @param {tf.LayersModel} network Actor network
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
 * Training version of a network based on Deep Deterministic Policy Gradient model.
 * Critic network returns a scalar and actor network returns a 1D tensor with 4 values.
 */
class DdpgTrainingNetwork extends SurvaillantTrainingNetwork {
    /** Number of outputs for critic network */
    static CRITIC_OUTPUTS_COUNT = 1;

    /**
     * Constructor
     *
     * @param {tf.LayersModel} actor Actor network
     * @param {tf.LayersModel} critic Critic network
     * @param {tf.AdamOptimizer} actorOpt Actor optimizer
     * @param {tf.AdamOptimizer} criticOpt Critic optimizer
     */
    constructor(actor, critic, actorOpt, criticOpt) {
        const modelByName = {};
        modelByName[ACTOR_NETWORK_NAME] = { network: actor, optimizer: actorOpt };
        modelByName[CRITIC_NETWORK_NAME] = { network: critic, optimizer: criticOpt };

        super(modelByName);
    }

    /**
     * Generate output predictions of actor network for the given inputs
     *
     * @param {Tensor[]} inputs Batch of tensors for each input
     * @return {Tensor} Predictions
     */
    actor(inputs) {
        return this.network(ACTOR_NETWORK_NAME).predict(inputs);
    }

    /**
     * Train actor network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainActor(loss) {
        this.train(ACTOR_NETWORK_NAME, loss);
    }

    /**
     * Generate output predictions of critic network for the given batch of games and actions
     *
     * @param {Tensor[]} gameInputs Batches of game input
     * @param {Tensor} actionInputs Batch of actions
     * @return {Tensor} Predictions
     */
    critic(gameInputs, actionInputs) {
        return this.network(CRITIC_NETWORK_NAME).predict([ ...gameInputs, actionInputs ]);
    }

    /**
     * Train critic network with the given loss function
     *
     * @param {function():tf.Scalar} loss Loss function
     */
    trainCritic(loss) {
        this.train(CRITIC_NETWORK_NAME, loss);
    }
}

/**
 * Create a training DDPG network with random weights
 *
 * @param {number[][]} shapeByInput Dimension for each axis by input
 * @param {number} actions Actions count
 * @param {number} actorLearningRate Actor network learning rate with Adam optimizer
 * @param {number} criticLearningRate Critic network learning rate with Adam optimizer
 * @return {DdpgTrainingNetwork} Network
 */
function random(shapeByInput, actions, actorLearningRate = DefaultHyperparameter.ACTOR_LEARNING_RATE, criticLearningRate = DefaultHyperparameter.CRITIC_LEARNING_RATE) {
    const flatten = t => t.shape.length > 2 ? tf.layers.flatten().apply(t) : t;

    const gameInputs = shapeByInput.map(shape => tf.input({ shape: shape }));
    const flattenGameInputs = gameInputs.length > 1 ? tf.layers.concatenate().apply(gameInputs.map(flatten)) : gameInputs.map(flatten);
    const actionsInput = tf.input({ shape: [ actions ] });

    const actor = keras.feedforward([ 64, 64 ].concat([ actions ]), flattenGameInputs, "tanh");
    const critic = keras.feedforward([ 256, 256 ].concat([ DdpgTrainingNetwork.CRITIC_OUTPUTS_COUNT ]), tf.layers.concatenate({ axis: -1 })
        .apply([
            keras.feedforward([ 16, 32 ], flattenGameInputs, CRITIC_ACTIVATION_FUNC),
            keras.dense({ units: 32, activation: CRITIC_ACTIVATION_FUNC }).apply(actionsInput)
        ]), CRITIC_ACTIVATION_FUNC);

    return new DdpgTrainingNetwork(
        tf.model({ inputs: gameInputs, outputs: [ actor ] }),
        tf.model({ inputs: [ ...gameInputs, actionsInput ], outputs: [ critic ] }),
        keras.adam(actorLearningRate),
        keras.adam(criticLearningRate)
    );
}

/**
 * Create a training DDPG network with existing networks
 *
 * @param {String} actor Path to the file defining the actor network
 * @param {String} critic Path to the file defining the critic network
 * @param {number} actorLearningRate Actor network learning rate
 * @param {number} criticLearningRate Critic network learning rate
 * @return {Promise<DdpgTrainingNetwork>} Network
 */
async function fromNetworks(actor, critic, actorLearningRate = DefaultHyperparameter.ACTOR_LEARNING_RATE, criticLearningRate = DefaultHyperparameter.CRITIC_LEARNING_RATE) {
    return new DdpgTrainingNetwork(
        await tf.loadLayersModel(actor),
        await tf.loadLayersModel(critic),
        keras.adam(actorLearningRate),
        keras.adam(criticLearningRate)
    );
}

/**
 * Create a final DDPG network based on its actor network
 *
 * @param {String} actor Path to the file defining the actor network
 * @return {Promise<DdpgFinalNetwork>} Network
 */
async function fromNetwork(actor) {
    return new DdpgFinalNetwork(await tf.loadLayersModel(actor));
}

export { ACTOR_NETWORK_NAME, CRITIC_NETWORK_NAME, random, fromNetwork, fromNetworks };

