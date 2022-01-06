/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import TimeUnit from "timeunit";
import { v4 as uuidv4 } from "uuid";
import { GamesStats } from "../common/game/stats.js";
import { TrainingInformationKey } from "../common/game/training.js";
import LOGGER from "../common/logger.js";
import { DdpgDefaultHyperparameter as DefaultHyperparameter } from "./hyperparameters.js";
import { ACTOR_NETWORK_NAME, CRITIC_NETWORK_NAME, random } from "./networks.js";

const STATISTICS_FREQUENCY = 40;

/**
 * Buffer storing games history
 */
class Buffer {
    #capacity;
    #batchSize;
    #size = 0;
    #states;
    #nextStates;
    #actions;
    #rewards;

    /**
     * Constructor
     *
     * @param {number} capacity Capacity
     * @param {number} batchSize Batch size
     */
    constructor(capacity = DefaultHyperparameter.BUFFER_CAPACITY, batchSize = DefaultHyperparameter.TRAIN_BATCH_SIZE) {
        this.#capacity = capacity;
        this.#batchSize = batchSize;

        this.#states = new Array(this.#capacity);
        this.#nextStates = new Array(this.#capacity);
        this.#actions = new Array(this.#capacity);
        this.#rewards = new Array(this.#capacity);
    }

    /**
     * Store game step's data
     *
     * @param {Tensor[]} state State of the game
     * @param {Tensor} action Action done
     * @param {number} reward Reward obtained
     * @param {Tensor[]} nextState Next state of the game
     */
    store(state, action, reward, nextState) {
        const index = this.#size % this.#capacity;

        this.#states[index]?.map(t => t?.dispose());
        this.#states[index] = state;
        this.#nextStates[index] = nextState;
        this.#actions[index]?.dispose();
        this.#actions[index] = action;
        this.#rewards[index] = reward;

        this.#size++;
    }

    /**
     * Execute backpropagation on training network
     *
     * @param {DdpgTrainingNetwork} network Training network
     * @param {DdpgTrainingNetwork} targetNetwork Target network
     * @param {number} gamma Gamma
     */
    backpropagation(network, targetNetwork, gamma = DefaultHyperparameter.GAMMA) {
        const batchIndices = tf.tidy(() => tf.randomUniform([ this.#batchSize ], 0, Math.min(this.#size, this.#capacity), "int32").dataSync());

        const statesBatches = Array.apply(null, new Array(this.#states[batchIndices[0]].length)).map(() => new Array(batchIndices.length));
        const nextStatesBatches = Array.apply(null, new Array(this.#nextStates[batchIndices[0]].length)).map(() => new Array(batchIndices.length));
        const rewardsBatch = new Array(batchIndices.length);
        const actionsBatch = new Array(batchIndices.length);
        for (let i = 0; i < batchIndices.length; i++) {
            const index = batchIndices[i];

            this.#states[index].forEach((s, iter) => statesBatches[iter][i] = s);
            this.#nextStates[index].forEach((s, iter) => nextStatesBatches[iter][i] = s);
            rewardsBatch[i] = this.#rewards[index];
            actionsBatch[i] = this.#actions[index];
        }

        tf.tidy(() => {
            const nextStatesBatchTensor = nextStatesBatches.map(batch => tf.concat(batch.map(t => t.expandDims())));
            const statesBatchTensor = statesBatches.map(batch => tf.concat(batch.map(t => t.expandDims())));
            const actionsBatchTensor = tf.concat(actionsBatch.map(t => t.expandDims()));
            const rewardsBatchTensor = tf.tensor2d(rewardsBatch, [ rewardsBatch.length, 1 ]);

            // Train critic network
            network.trainCritic(() => {
                const y = rewardsBatchTensor.add(targetNetwork.critic(nextStatesBatchTensor, targetNetwork.actor(nextStatesBatchTensor)).mul(gamma));
                const critic = network.critic(statesBatchTensor, actionsBatchTensor);

                return tf.losses.meanSquaredError(y, critic);
            });

            // Train actor network
            network.trainActor(() => network.critic(statesBatchTensor, network.actor(statesBatchTensor)).mean().neg());
        });
    }

    /**
     * Dispose buffer's content
     */
    dispose() {
        for (let i = 0; i < this.#capacity; i++) {
            this.#states[i]?.map(t => t?.dispose());
            this.#nextStates[i]?.map(t => t?.dispose());
            this.#actions[i]?.dispose();
        }
    }
}

/**
 * Agent responsible for training a network based on DDPG model
 */
class DdpgAgent {
    static ID = "ddpg";

    #epochs;
    #turns;
    #tau;
    #gamma;
    #bufferCapacity;
    #trainBatchSize;
    #actorLearningRate;
    #criticLearningRate;

    /**
     * Constructor
     *
     * @param {number} epochs Epochs
     * @param {number} turns Maximum number of turns that can be done
     * @param {number} tau Tau
     * @param {number} gamma Gamma
     * @param {number} bufferCapacity Buffer's capacity
     * @param {number} trainBatchSize Training batch size
     * @param {number} actorLearningRate Actor network learning rate
     * @param {number} criticLearningRate Critic network learning rate
     */
    constructor(epochs, turns, tau = DefaultHyperparameter.TAU, gamma = DefaultHyperparameter.GAMMA, bufferCapacity = DefaultHyperparameter.BUFFER_CAPACITY, trainBatchSize = DefaultHyperparameter.TRAIN_BATCH_SIZE, actorLearningRate = DefaultHyperparameter.ACTOR_LEARNING_RATE, criticLearningRate = DefaultHyperparameter.CRITIC_LEARNING_RATE) {
        this.#epochs = epochs;
        this.#turns = turns;
        this.#tau = tau;
        this.#gamma = gamma;
        this.#bufferCapacity = bufferCapacity;
        this.#trainBatchSize = trainBatchSize;
        this.#actorLearningRate = actorLearningRate;
        this.#criticLearningRate = criticLearningRate;
    }

    /**
     * Train the given network
     *
     * @param {DdpgTrainingNetwork} network Network to train
     * @param {Environment} env Training environment to use
     * @param {function(number, Object, DdpgTrainingNetwork)} onEpoch Callback called at the end of each epoch (arguments: current epoch, training information, network)
     * @return {Promise<[String, GamesStats[]]>} Training identifier and Games statistics per epoch
     */
    async train(network, env, onEpoch) {
        const trainingNetwork = random(env.shapes, env.actionsCount, this.#actorLearningRate, this.#criticLearningRate);
        network.copyWeightsTo(trainingNetwork);

        const buffer = new Buffer(this.#bufferCapacity, this.#trainBatchSize);
        const statsPerEpoch = [];

        for (let epoch = 0; epoch < this.#epochs; epoch++) {
            statsPerEpoch.push(this.#doEpoch(trainingNetwork, network, env, buffer, epoch));

            if (epoch % STATISTICS_FREQUENCY === 0) {
                const episodicStats = new GamesStats();
                statsPerEpoch.slice(-STATISTICS_FREQUENCY).map(s => episodicStats.addAll(s));
                const statsSummary = episodicStats.summary();
                LOGGER.debug(`[Epoch ${epoch}] Statistics on the last ${STATISTICS_FREQUENCY} epochs = ` +
                    `Rewards: (mean=${statsSummary.rewards.mean}, std=${statsSummary.rewards.std}, min=${statsSummary.rewards.min}, max=${statsSummary.rewards.max}). ` +
                    `Turns: (mean=${statsSummary.turns.mean}, std=${statsSummary.turns.std}, min=${statsSummary.turns.min}, max=${statsSummary.turns.max})`);
            }

            const info = {};
            info[TrainingInformationKey.AGENT] = DdpgAgent.ID;
            info[TrainingInformationKey.EPOCHS] = epoch + 1;
            info[TrainingInformationKey.ENV] = env.info();
            info[TrainingInformationKey.ID] = uuidv4();

            await onEpoch(epoch, info, network);
        }
        buffer.dispose();

        return [ `${DdpgAgent.ID}_${this.#epochs}_${env.id()}`, statsPerEpoch ];
    }

    /**
     * Execute an epoch
     *
     * @param {DdpgTrainingNetwork} network Training network
     * @param {DdpgTrainingNetwork} targetNetwork Target network
     * @param {Environment} env Training environment to use
     * @param {Buffer} buffer Buffer containing games history
     * @param {number} epoch Current epoch
     * @return {GamesStats} Games statistics
     */
    #doEpoch(network, targetNetwork, env, buffer, epoch) {
        const funcStart = process.hrtime.bigint();

        // Initialize environment and stats recorders
        const stats = new GamesStats();
        env.reset();

        let lastState = env.state();
        for (let i = 0; i < this.#turns; i++) {
            // Play
            const { done, action, reward } = tf.tidy(() => {
                let logits = network.actor(lastState.map(t => t.expandDims()));
                logits = logits.reshape([ logits.shape[logits.shape.length - 1] ]);

                const action = tf.tidy(() => tf.multinomial(logits, 1).dataSync()[0]);
                return { ...env.step(action), action: logits };
            });

            // Update buffer
            const state = env.state();
            buffer.store(lastState, action, reward, state);

            // Backpropagation
            buffer.backpropagation(network, targetNetwork, this.#gamma);

            // Update target network
            tf.tidy(() => {
                for (const name of [ ACTOR_NETWORK_NAME, CRITIC_NETWORK_NAME ]) {
                    const targetNet = targetNetwork.network(name);
                    const weights = targetNet.getWeights();
                    const newWeights = network.network(name).getWeights();

                    targetNet.setWeights(weights.map((w, i) => newWeights[i].mul(this.#tau).add(w.mul(1 - this.#tau))));
                }
            });

            lastState = state;
            if (done) {
                break;
            }
        }

        // Add stats
        const gameStats = env.game.stats;
        stats.add(gameStats);

        const statsSummary = stats.summary();
        LOGGER.debug(`[Epoch ${epoch}] Epoch done in ${TimeUnit.nanoseconds.toSeconds(Number(process.hrtime.bigint() - funcStart))}s. ` +
            `Turns: ${statsSummary.turns.sum}. Score: ${statsSummary.score.sum}. Rewards: ${statsSummary.rewards.sum}`);

        return stats;
    }
}

export { DdpgAgent };
