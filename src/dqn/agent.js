/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import { fromZero } from "./network.js";

import tf from "@tensorflow/tfjs";

import { flashlight } from "../common/states.js";

import SurvaillantGame from "../survaillant/src/index.js";

import LOGGER from "../common/logger.js";

import { TrainingInformationKey } from "../common/game/training.js";
import { v4 as uuidv4 } from "uuid";
/**
  * TODO
  */
class SurvaillantGameAgent {

    constructor(config, env) {
        this.model = fromZero(config.height, config.width);
        this.modelTarget = fromZero(config.height, config.width);
        
        this.config = config;

        this.env = env;

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
        let episodeRewardHistory = [];
        
        let action = -1;
        
        let frameCount = 0;
        let epsilonInterval = this.config.epsilonMax - this.config.epsilonMin;
    
        let old = 2; 
    
        for(let episodeCount =0; episodeCount < old ; episodeCount++) {
    
            LOGGER.info(`${episodeCount}/${old}`);

            const game = SurvaillantGame.createGame(SurvaillantGame.getMaps()[0]); 
            const gameG = () => flashlight(game, 4);
    
            let state = gameG(game);
    
            let episodeReward = 0;
    
            for(let i = 0; i < this.config.maxStepsPerEpisode; i++) {

                frameCount += 1;
    
                if(frameCount < this.config.espilonRanomFrames || this.config.epsilon > Math.random()) {
                    action = Math.floor(Math.random() * this.config.actions);
                } else {
    
                    state = tf.expandDims(state);
                    action = this.model.predict(state).argMax(-1).dataSync()[0];
                }
    
                this.epsilon -= epsilonInterval / this.config.epsilonGreedyFrames;
                this.epsilon = Math.max(this.epsilon, this.epsilonMin);
    
                const direction = SurvaillantGame.PlayerMoves[action];
                let result = game.movePlayer(direction[0], direction[1]);
                let stateNext = gameG(game);
    
                const done = result === SurvaillantGame.ActionConsequence.BAD_MOVEMENT || result === SurvaillantGame.ActionConsequence.GAME_OVER;
    
                episodeReward+= 1;
    
                // Save actions and states in replay buffer
                actionHistory.push(action);
                stateHistory.push(state);
                stateNextHistory.push(stateNext);
                doneHistory.push(done);
    
                let reward;
    
                if(result === SurvaillantGame.ActionConsequence.BAD_MOVEMENT || result === SurvaillantGame.ActionConsequence.GAME_OVER) {
                    reward = -5;
                } else {
                    reward = 1;
                }
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
                        
                        
                        
                        // Q value = reward + discount factor * expected future reward
                        let updatedQValues = rewardsSample.add(tf.max(futureRewards, 1).mul(tf.scalar(this.config.gamma)));
                        
                        // If final frame set the last value to -1
                        updatedQValues = updatedQValues.mul(tf.scalar(1).sub(doneSample)).sub(doneSample);
                        // Create a mask so we only calculate loss on the updated Q-values
                        let masks = tf.oneHot(actionSample, this.config.numActions);
                        // Train the model on the states and updated Q-values
                        let qValues = this.model.predict(tf.concat(stateSample));
                        // Apply the masks to the Q-values to get the Q-value for action taken
                        let qAction = tf.sum(tf.mul(qValues, masks), 1);
                        // Calculate loss between new Q-value and old Q-value
    
                        let hubberLoss = tf.losses.huberLoss(updatedQValues, qAction);
                        return hubberLoss;
                    };
    
                    // Backpropagation
                    this.model.train("dqnPolicy", loss);
                    this.modelTarget.train("dqnPolicy", loss);
                }
                
                if(frameCount % this.config.updateTargetNetwork == 0) {
                    // update the the target network with new weights
                    this.modelTarget.setWeights();
                    // Log details
                    console.log("running reward: "+ episodeReward + "  at episode " + episodeCount + ", frame count " + frameCount + " score : " + game.getScores());
                }
    
                // Limit the state and reward history
                if(rewardsHistory.length > this.config.maxMemoryLength) {
                    rewardsHistory.shift();
                    stateHistory.shift();
                    stateNextHistory.shift();
                    actionHistory.shift();
                    doneHistory.shift();
                }
    
                if (done) {
                    break;
                }
            }
    
            // Update running reward to check condition for solving
            episodeRewardHistory.push(episodeReward);
            
            if(episodeRewardHistory.length > 100){
                episodeRewardHistory.shift();
            }

            const info = {};
            info[TrainingInformationKey.AGENT] = "DQN";
            info[TrainingInformationKey.EPOCHS] = episodeCount + 1;
            info[TrainingInformationKey.ENV] = this.env.info();
            info[TrainingInformationKey.ID] = uuidv4();

            await save(episodeCount, info, this.model);
        }
    }
}

export default SurvaillantGameAgent;