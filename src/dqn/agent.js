/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import { fromZero, fromNetworks } from "./network.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";

import { sep } from "path";

import tf from "@tensorflow/tfjs";

import LOGGER from "../common/logger.js";
import { GamesStats } from "../common/game/stats.js";

import { TrainingInformationKey } from "../common/game/training.js";
import { v4 as uuidv4 } from "uuid";

/**
  * Agent to describe DQN implementation
  */
class SurvaillantDQNAgent {

    static ID = "dqn";

    constructor(config, env) {

        if (env.baseNetworkFolder === undefined || env.baseNetworkFolder === null) {
            this.model = fromZero(env.stateShape.x, env.stateShape.y, env.stateShape.z);
            this.modelTarget = fromZero(env.stateShape.x, env.stateShape.y, env.stateShape.z);
        } else {
            this.model = fromNetworks(`file://${env.baseNetworkFolder}${sep}${SurvaillantDQNAgent.ID}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`);
            this.modelTarget = fromNetworks(`file://${env.baseNetworkFolder}${sep}${SurvaillantDQNAgent.ID}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`);
        }

        this.model = fromZero(env.stateShape.x, env.stateShape.y, env.stateShape.z);
        this.modelTarget = fromZero(env.stateShape.x, env.stateShape.y, env.stateShape.z);
        
        this.config = config;
        this.env = env;
        this.actions = 4;

        this.model.printSummary();
    }

    /**
     * Train function for agent
     *
     */
    async train(save) {
        let actionHistory = [];
        let stateHistory = [];
        let stateNextHistory = [];
        let rewardsHistory = [];
        let doneHistory = [];

        const stats = new GamesStats();

        let action;
        let frameCount = 0;

        let epsilonInterval = this.config.epsilonMax - this.config.epsilonMin;

        for (let episodeCount = 0; episodeCount < this.config.epoch ; episodeCount++) {    

            this.env.reset();

            let state = this.env.state();

            for (let i = 0; i < this.config.maxStepsPerEpisode; i++) {

                frameCount += 1;

                if (frameCount < this.config.epsilonRandomFrames || this.config.epsilon > Math.random()) {
                    action = Math.floor(Math.random() * this.actions);
                } else {
                    let state_tensor = tf.expandDims(state);
                    action = this.model.predict(state_tensor).argMax(-1).dataSync()[0];
                }

                this.epsilon -= epsilonInterval / this.config.epsilonGreedyFrames;
                this.epsilon = Math.max(this.epsilon, this.epsilonMin);

                const { reward, done } = this.env.step(action);
                let stateNext = this.env.state();

                // Save actions and states in replay buffer
                actionHistory.push(action);
                stateHistory.push(state);
                stateNextHistory.push(stateNext);
                doneHistory.push(done);
                rewardsHistory.push(reward);

                state = stateNext;

                if (frameCount % this.config.updateAfterNbActions == 0 && doneHistory.length > this.config.batchSize) {

                    const loss = () => {

                        // Get indices of samples for replay buffers
                        let indices = tf.randomUniform([ this.config.batchSize ], 0, doneHistory.length, "int32").arraySync().map(Math.floor);

                        // Using list comprehension to sample from replay buffer
                        let stateSample = indices.map(i => stateHistory[i].expandDims());
                        let stateNextSample = indices.map(i => stateNextHistory[i].expandDims());
                        let rewardsSample = tf.tensor1d(
                            indices.map(i => rewardsHistory[i])
                        );
                        let actionSample = indices.map(i => actionHistory[i]);

                        let doneSample = tf.tensor1d(
                            indices.map(i => doneHistory[i])
                        );
                        // Build the updated Q-values for the sampled future states
                        // Use the target model for stabilitys

                        let futureRewards = this.modelTarget.predict(tf.concat(stateNextSample));

                        const hubberLoss = tf.tidy(() => {

                            // Q value = reward + discount factor * expected future reward
                            let updatedQValues = rewardsSample.add(tf.max(futureRewards, 1).mul(tf.scalar(this.config.gamma)));

                            // If final frame set the last value to -1
                            updatedQValues = updatedQValues.mul(tf.scalar(1).sub(doneSample)).sub(doneSample);
                            // Create a mask so we only calculate loss on the updated Q-values

                            let masks = tf.oneHot(actionSample, this.actions);

                            // Train the model on the states and updated Q-values
                            let qValues = this.model.predict(tf.concat(stateSample));

                            // Apply the masks to the Q-values to get the Q-value for action taken
                            let qAction = tf.sum(tf.mul(qValues, masks), 1);
                            // Calculate loss between new Q-value and old Q-value

                            return tf.losses.huberLoss(updatedQValues, qAction);
                        });
                        
                        return hubberLoss;
                    };

                    // Backpropagation
                    tf.tidy(() => {
                        this.model.train("dqn", loss);
                    });
                }

                if (done) {

                    stats.add(this.env.game.stats);

                    this.env.reset();

                    break;
                }    
            }

            if ((episodeCount + 1) % this.config.updateTargetNetwork == 0) {

                // update the the target network with new weights
                tf.tidy(() => {
                    this.modelTarget.setWeights(this.model.getWeights());
                });

                const info = {};
                info[TrainingInformationKey.AGENT] = SurvaillantDQNAgent.ID;
                info[TrainingInformationKey.EPOCHS] = episodeCount + 1;
                info[TrainingInformationKey.ENV] = this.env.info();
                info[TrainingInformationKey.ID] = uuidv4();

                //Save the target
                await save(this.config.epoch, info, this.modelTarget);

                // Log details
                LOGGER.info(`Weights update at frame count : ${frameCount} at epoche ${episodeCount + 1}/${this.config.epoch}`);
            }

            // Limit the state and reward history
            if (rewardsHistory.length > this.config.maxMemoryLength) {
                rewardsHistory.shift();
                stateHistory.shift();
                stateNextHistory.shift();
                actionHistory.shift();
                doneHistory.shift();
            }

            const statsSummary = stats.summary();

            LOGGER.debug(`Rewards: (mean=${statsSummary.rewards.mean}, std=${statsSummary.rewards.std}, min=${statsSummary.rewards.min}, max=${statsSummary.rewards.max}). ` +
            `Turns: (mean=${statsSummary.turns.mean}, std=${statsSummary.turns.std}, min=${statsSummary.turns.min}, max=${statsSummary.turns.max}).`);
        }

        return [ `${SurvaillantDQNAgent.ID}_${this.config.epoch}_${this.env.id()}`, [ stats ] ];
    }
}

export { SurvaillantDQNAgent };
