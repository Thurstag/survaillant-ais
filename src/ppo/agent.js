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
import { SurvaillantTrainingNetwork } from "../common/network.js";
import scipy from "../common/scipy/index.js";
import { OperationsRecorder } from "../common/time.js";
import { PpoDefaultHyperparameter as DefaultHyperparameter } from "./hyperparameters.js";

/**
 * Compute the log-probabilities of taking actions a by using the logits
 *
 * @param {Tensor} logits Policy output prediction
 * @param {Tensor} action Action to take
 * @return {Tensor} Log-probabilities
 */
function logProbabilities(logits, action) {
    return tf.sum(tf.oneHot(action, SurvaillantTrainingNetwork.ACTIONS_COUNT).mul(tf.softmax(logits)), 1);
}

/**
 * Compute the discounted cumulative sums of x
 *
 * @param {number[]} x X
 * @param {number} discount Discount
 * @return {number[]} Discounted cumulative sums
 */
function discountedCumulativeSums(x, discount) {
    return scipy.lfilter([ 1 ], [ 1, -discount ], x.slice().reverse()).reverse();
}

/**
 * Buffer storing data related to games played by the trained network
 */
class TrajectoriesBuffer {
    /**
     * Constructor
     *
     * @param {number} size Buffer's size
     * @param {number} gamma Gamma
     * @param {number} lam Lam
     */
    constructor(size, gamma, lam) {
        this.observationBuffer = new Array(size);
        this.actionBuffer = new Array(size);
        this.advantageBuffer = new Array(size);
        this.rewardBuffer = new Array(size);
        this.returnBuffer = new Array(size);
        this.valueBuffer = new Array(size);
        this.logprobabilityBuffer = new Array(size);
        this.gamma = gamma;
        this.lam = lam;
        this.pointer = 0;
        this.trajectoryStartIndex = 0;
    }

    /**
     * Store game step's data
     *
     * @param {Tensor} observation State of the map
     * @param {Tensor} action Action done
     * @param {number} reward Reward obtained
     * @param {number} value Value network's output
     * @param {Tensor} logProbability Log-probabilities of taking actions
     */
    store(observation, action, reward, value, logProbability) {
        this.observationBuffer[this.pointer] = observation;
        this.actionBuffer[this.pointer] = action;
        this.rewardBuffer[this.pointer] = reward;
        this.valueBuffer[this.pointer] = value;
        this.logprobabilityBuffer[this.pointer] = logProbability;
        this.pointer += 1;
    }

    /**
     * Compute advantage estimates and rewards-to-go
     *
     * @param {number} lastValue Last value's output
     */
    finishTrajectory(lastValue) {
        const rewardBuffer = this.rewardBuffer.slice(this.trajectoryStartIndex, this.pointer);
        const rewards = rewardBuffer.concat([ lastValue ]);
        const values = this.valueBuffer.slice(this.trajectoryStartIndex, this.pointer).concat([ lastValue ]);

        const deltas = rewardBuffer.map((reward, index) => values[index + 1] * this.gamma - values[index] + reward);

        const advantages = discountedCumulativeSums(deltas, this.gamma * this.lam);
        let returns = discountedCumulativeSums(rewards, this.gamma);
        returns = returns.slice(0, returns.length - 1);

        for (let i = this.trajectoryStartIndex; i < this.pointer; i++) {
            this.advantageBuffer[i] = advantages[i - this.trajectoryStartIndex];
            this.returnBuffer[i] = returns[i - this.trajectoryStartIndex];
        }

        this.trajectoryStartIndex = this.pointer;
    }

    /**
     * Get data as tensors
     *
     * @return {Tensor[]} Observations, actions, advantages, returns, log probabilities
     */
    tensors() {
        // Normalize advantages tensor
        const advantageAsTensor = tf.concat(this.advantageBuffer.map(a => tf.tensor1d([ a ])));
        const advantageMean = advantageAsTensor.mean();
        const advantageStd = advantageAsTensor.sub(advantageMean).pow(2).mean().sqrt();


        return [
            tf.concat(this.observationBuffer),
            tf.concat(this.actionBuffer),
            advantageAsTensor.sub(advantageMean).div(advantageStd),
            tf.concat(this.returnBuffer.map(r => tf.tensor2d([ [ r ] ]))),
            tf.concat(this.logprobabilityBuffer.map(r => r.expandDims()))
        ];
    }
}

/**
 * Agent responsible for training a network based on PPO model
 */
class PpoAgent {
    static ID = "ppo";

    #epochs;
    #stepsPerEpoch;
    #policyTrainingIterations;
    #valueTrainingIterations;
    #limitKl;
    #clipRatio;
    #gamma;
    #lam;

    /**
     * Constructor
     *
     * @param {number} epochs Epochs
     * @param {number} stepsPerEpoch Steps per epoch
     * @param {number} policyTrainingIterations Training iterations for policy network
     * @param {number} valueTrainingIterations Training iterations for value network
     * @param {number} targetKl Target KL
     * @param {number} clipRatio Clip ratio
     * @param {number} gamma Gamma
     * @param {number} lam Lam
     */
    constructor(epochs, stepsPerEpoch = DefaultHyperparameter.STEPS_PER_EPOCH, policyTrainingIterations = DefaultHyperparameter.TRAIN_POLICY_ITERATIONS, valueTrainingIterations = DefaultHyperparameter.TRAIN_VALUE_ITERATIONS, targetKl = DefaultHyperparameter.TARGET_KL, clipRatio = DefaultHyperparameter.CLIP_RATIO, gamma = DefaultHyperparameter.GAMMA, lam = DefaultHyperparameter.LAM) {
        this.#epochs = epochs;
        this.#stepsPerEpoch = stepsPerEpoch;
        this.#policyTrainingIterations = policyTrainingIterations;
        this.#valueTrainingIterations = valueTrainingIterations;
        this.#limitKl = 1.5 * targetKl;
        this.#clipRatio = clipRatio;
        this.#gamma = gamma;
        this.#lam = lam;
    }

    /**
     * Train the given network
     *
     * @param {PpoTrainingNetwork} network Network to train
     * @param {Environment} env Training environment to use
     * @param {function(number, Object, PpoTrainingNetwork)} onEpoch Callback called at the end of each epoch (arguments: current epoch, training information, network)
     * @return {Promise<[String, GamesStats[]]>} Training identifier and Games statistics per epoch
     */
    async train(network, env, onEpoch) {
        const stats = [];

        for (let epoch = 0; epoch < this.#epochs; epoch++) {
            tf.tidy(() => {
                // Create history buffer
                const buffer = new TrajectoriesBuffer(this.#stepsPerEpoch, this.#gamma, this.#lam);

                // Play
                stats.push(this.#play(network, buffer, env, epoch));

                // Train network
                this.#trainOnBuffer(network, buffer, epoch);
            });

            const info = {};
            info[TrainingInformationKey.AGENT] = PpoAgent.ID;
            info[TrainingInformationKey.EPOCHS] = epoch + 1;
            info[TrainingInformationKey.ENV] = env.info();
            info[TrainingInformationKey.ID] = uuidv4();

            await onEpoch(epoch, info, network);
        }

        return [ `${PpoAgent.ID}_${this.#epochs}_${env.id()}`, stats ];
    }

    /**
     * Run multiple games with the given network
     *
     * @param {PpoTrainingNetwork} network Network used to play games
     * @param {TrajectoriesBuffer} buffer Buffer where games' data should be stored
     * @param {Environment} env Training environment to use
     * @param {number} epoch Current epoch
     * @return {GamesStats} Games statistics
     */
    #play(network, buffer, env, epoch) {
        const funcStart = process.hrtime.bigint();

        // Initialize environment and stats recorders
        const opsRecorder = new OperationsRecorder();
        const stats = new GamesStats();
        env.reset();

        // Play randomly and aggregate games data
        for (let step = 0; step < this.#stepsPerEpoch; step++) {
            opsRecorder.start();

            // Get the logits, valueT
            const observation = env.state().expandDims();
            const [ logits, valueT ] = network.predict(observation).map(t => t.reshape([ t.shape[t.shape.length - 1] ]));
            const action = tf.multinomial(logits, 1);

            // Take one step in the environment
            const { reward, done } = env.step(action.dataSync());
            const newObservation = env.state().expandDims();

            // Get the log-probability of the action
            const logProbabilityT = logProbabilities(logits, action);

            // Store obs, act, rew, v_t, logp_pi_t
            buffer.store(observation, action, reward, valueT.dataSync()[0], logProbabilityT);

            // Finish trajectory if a terminal state is reached
            if (done || step === this.#stepsPerEpoch - 1) {
                const lastValue = done ? 0 : network.value(newObservation).dataSync()[0];
                buffer.finishTrajectory(lastValue);

                // Add stats
                stats.add(env.game.stats);

                // Reset environment
                env.reset();
            }

            opsRecorder.end();
        }

        const statsSummary = stats.summary();
        LOGGER.debug(`[Epoch ${epoch}] Game steps done in ${TimeUnit.nanoseconds.toSeconds(Number(process.hrtime.bigint() - funcStart))}s. ` +
            `Rewards: (mean=${statsSummary.rewards.mean}, std=${statsSummary.rewards.std}, min=${statsSummary.rewards.min}, max=${statsSummary.rewards.max}). ` +
            `Turns: (mean=${statsSummary.turns.mean}, std=${statsSummary.turns.std}, min=${statsSummary.turns.min}, max=${statsSummary.turns.max}). Game step/s: ${opsRecorder.ops()}`);

        return stats;
    }

    /**
     * Train the given network on buffer's dataset
     *
     * @param {PpoTrainingNetwork} network Network to train
     * @param {TrajectoriesBuffer} buffer Buffer containing games' data
     * @param {number} epoch Current epoch
     */
    #trainOnBuffer(network, buffer, epoch) {
        const opsRecorder = new OperationsRecorder();
        const funcStart = process.hrtime.bigint();

        // Extract buffer's tensors
        const [ observations, actions, advantages, returns, logprobabilities ] = buffer.tensors();

        // Update the policy and implement early stopping using KL divergence
        const minAdvantage = tf.tidy(() => {
            const clipRatioAsTensor = tf.scalar(this.#clipRatio);

            return tf.where(
                advantages.greater(tf.zerosLike(advantages)),
                clipRatioAsTensor.add(1).mul(advantages),
                clipRatioAsTensor.neg().add(1).mul(advantages)
            );
        });
        for (let i = 0; i < this.#policyTrainingIterations; i++) {
            opsRecorder.start();

            const kl = tf.tidy(() => {
                network.trainPolicy(() => {
                    const ratio = logProbabilities(network.actions(observations), actions).sub(logprobabilities).exp();

                    return minAdvantage.minimum(ratio.mul(advantages)).mean().neg();
                });

                return logprobabilities.sub(logProbabilities(network.actions(observations), actions)).mean().dataSync()[0];
            });

            opsRecorder.end();

            if (kl > this.#limitKl) {
                LOGGER.warn(`[Epoch ${epoch}] Early stopping of policy training, kl: ${kl} which exceeds limit: ${this.#limitKl}`);
                break;
            }
        }

        // Update the value function
        for (let i = 0; i < this.#valueTrainingIterations; i++) {
            opsRecorder.start();

            tf.tidy(() => network.trainValue(() => tf.losses.meanSquaredError(returns, network.value(observations))));

            opsRecorder.end();
        }

        LOGGER.debug(`[Epoch ${epoch}] Networks training on games history done in ${TimeUnit.nanoseconds.toSeconds(Number(process.hrtime.bigint() - funcStart))}s. Training/s: ${opsRecorder.ops()}`);
    }
}

export { PpoAgent };
