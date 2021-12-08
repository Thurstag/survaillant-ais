/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import fs from "fs/promises";
import path from "path";
import Survaillant from "../survaillant/src/index.js";
import LOGGER from "./logger.js";

/**
 * Base class for networks playing games
 */
class SurvaillantFinalNetwork {
    /**
     * Generate predictions for the given batch of inputs
     *
     * @param {Tensor} inputs Batch of inputs
     * @return {Tensor} Prediction (in [0, {@link SurvaillantTrainingNetwork#ACTIONS_COUNT})) for each input
     */
    predict(inputs) { // eslint-disable-line no-unused-vars
        throw new Error("predict isn't implemented");
    }
}

/**
 * Base class for networks that are in training phase, implementing common methods like summary, gradients application...
 */
class SurvaillantTrainingNetwork {
    /** Number of possible actions that a player can do */
    static ACTIONS_COUNT = Survaillant.PlayerMoves.length;
    static SAVED_MODEL_EXTENSION = ".sm";
    static MODEL_FILENAME = "model.json";
    static TRAINING_INFO_FILENAME = "training_info.json";

    #networks;

    /**
     * Constructor
     *
     * @param {Object.<String, {network: tf.LayersModel, optimizer: tf.Optimizer}>} networks Network with it's optimizer by name
     */
    constructor(networks) {
        this.#networks = networks;
    }

    /**
     * Get the network with the given name
     *
     * @param name Network's name
     * @return {tf.LayersModel|undefined} Network or undefined if it doesn't exist
     */
    network(name) {
        return this.#networks[name].network;
    }

    /**
     * Train with gradients application the given network with loss
     *
     * @param name Network's name
     * @param {function():tf.Scalar} loss Loss function
     */
    train(name, loss) {
        const model = this.#networks[name];

        model.optimizer.applyGradients(tf.variableGrads(loss, this.#networks[name].network.getWeights()).grads);
    }

    /**
     * Print summary of networks in standard output
     */
    printSummary() {
        for (const [ name, { network } ] of Object.entries(this.#networks)) {
            LOGGER.info(`${name} network:`);
            network.summary();
        }
    }

    /**
     * Save networks
     *
     * @param {function(String): String} fileSupplier Function returning the location where the given network will be saved (argument: network's name)
     * @param {Object} info Training information
     * @param {String} protocol Protocol identifier
     * @return {Promise<void>} Promise
     */
    async saveTo(fileSupplier, info, protocol) {
        for (const [ name, { network } ] of Object.entries(this.#networks)) {
            const networkPath = fileSupplier(name);

            await network.save(`${protocol}://${networkPath}`, {
                includeOptimizer: true
            });
            await fs.writeFile(path.join(networkPath, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME), JSON.stringify(info), "utf-8");
        }
    }
}

export { SurvaillantTrainingNetwork, SurvaillantFinalNetwork };
