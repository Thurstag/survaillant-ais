/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import Survaillant from "../survaillant/src/index.js";

/**
 * Base class for networks, implementing common methods like summary, gradients application...
 */
class SurvaillantNetwork {
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
            console.log(`${name} network: `);
            network.summary();
        }
    }

    /**
     * Number of possible actions
     *
     * @return {number} Actions
     */
    static get ACTIONS_COUNT() {
        return Survaillant.PlayerMoves.length;
    }
}

export default SurvaillantNetwork;
