/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import tf from "@tensorflow/tfjs";

import { flashlight } from "../common/states.js";

import SurvaillantGameAgent from "./survaillant_game_agent.js";
import SurvaillantGame from "../survaillant/src/index.js";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DQN model that plays Survaillant."
    });
    parser.addArgument("--height", {
        type: "int",
        defaultValue: 20,
        help: "Height of the game board."
    });
    parser.addArgument("--width", {
        type: "int",
        defaultValue: 20,
        help: "Width of the game board."
    });
    parser.addArgument("--actions", {
        type: "float",
        defaultValue: 4,
        help: "Number of actions to provide"
    });
    parser.addArgument("--maxNumFrames", {
        type: "float",
        defaultValue: 1e6,
        help: "Maximum number of frames to run durnig the training. " +
        "Training ends immediately when this frame count is reached."
    });
    parser.addArgument("--replayBufferSize", {
        type: "int",
        defaultValue: 1e4,
        help: "Length of the replay memory buffer."
    });
    parser.addArgument("--epsilonInit", {
        type: "float",
        defaultValue: 0.5,
        help: "Initial value of epsilon, used for the epsilon-greedy algorithm."
    });
    parser.addArgument("--epsilonFinal", {
        type: "float",
        defaultValue: 0.01,
        help: "Final value of epsilon, used for the epsilon-greedy algorithm."
    });
    parser.addArgument("--epsilonDecayFrames", {
        type: "int",
        defaultValue: 1e5,
        help: "Number of frames of game over which the value of epsilon " +
        "decays from epsilonInit to epsilonFinal"
    });
    parser.addArgument("--batchSize", {
        type: "int",
        defaultValue: 64,
        help: "Batch size for DQN training."
    });
    parser.addArgument("--gamma", {
        type: "float",
        defaultValue: 0.99,
        help: "Reward discount rate."
    }) ;
    parser.addArgument("--learningRate", {
        type: "float",
        defaultValue: 1e-3,
        help: "Learning rate for DQN training."
    });
    parser.addArgument("--syncEveryFrames", {
        type: "int",
        defaultValue: 1e3,
        help: "Frequency at which weights are sync\"ed from the online network " +
        "to the target network."
    });
    parser.addArgument("--savePath", {
        type: "string",
        defaultValue: "./models/dqn",
        help: "File path to which the online DQN will be saved after training."
    });
    return parser.parse_args();
}

/**
 * Script entry point
 */
function main() {
    // Parse arguments
    const args = parseArguments();  

    const gameAgent = new SurvaillantGameAgent(9, 9);

    train(gameAgent, args);  
}

// Experience replay buffers
let action_history = [];
let state_history = [];
let state_next_history = [];
let rewards_history = [];
let done_history = [];
let episode_reward_history = [];
let episode_count = 0;
let frame_count = 0;
// Number of frames to take random action and observe output
let epsilon_random_frames = 50000;
// Number of frames for exploration
let epsilon_greedy_frames = 1000000.0;
// Maximum replay length
// Note: The Deepmind paper suggests 1000000 however this causes memory issues
let max_memory_length = 100000;
// Train the model after 4 actions
let update_after_actions = 4;
// How often to update the target network
let update_target_network = 10000;

let max_steps_per_episode = 10000;

let gamma = 0.99;

let batch_size = 32;

let num_actions = 4;

/**
 * Train function for agent
 * 
 * @param {*} gameAgent
 * @param {*} config 
 */
function train(gameAgent, config) {

    let optimizer = tf.train.adam(0.00025);
    
    let action = -1;

    let epsilon = config.epsilonInit;

    let epsilon_min = 0.1;
    let epsilon_max = 1.0;
    let epsilon_interval = epsilon_max - epsilon_min;

    let old = 1000; 

    for(let m =0; m < old ; m++) {

        const game = SurvaillantGame.createGame(SurvaillantGame.getMaps()[0]); 
        const gameG = () => flashlight(game, 4);

        let state = gameG(game);

        let episode_reward = 0;

        for(let i = 0; i < max_steps_per_episode; i++) {
                
            frame_count += 1;

            if(frame_count < epsilon_random_frames || epsilon > Math.random()) {
                action = Math.floor(Math.random() * config.actions);
            } else {

                state = tf.expandDims(state);
                action = gameAgent.model.predict(state).argMax(-1).dataSync()[0];
            }

            epsilon -= epsilon_interval / epsilon_greedy_frames;
            epsilon = Math.max(epsilon, epsilon_min);

            const direction = SurvaillantGame.PlayerMoves[action];
            let result = game.movePlayer(direction[0], direction[1]);
            let state_next = gameG(game);

            const done = result === SurvaillantGame.ActionConsequence.BAD_MOVEMENT || result === SurvaillantGame.ActionConsequence.GAME_OVER;

            episode_reward+= 1;

            // Save actions and states in replay buffer
            action_history.push(action);
            state_history.push(state);
            state_next_history.push(state_next);
            done_history.push(done);

            let reward;

            if(result === SurvaillantGame.ActionConsequence.BAD_MOVEMENT || result === SurvaillantGame.ActionConsequence.GAME_OVER) {
                reward = -5;
            } else {
                reward = 1;
            }
            rewards_history.push(reward);
            state = state_next;
            
            if (frame_count % update_after_actions == 0 && done_history.length > batch_size) {

                const loss = () => {

                    // Get indices of samples for replay buffers
                    let indices = tf.randomUniform([ batch_size ], 0, done_history.length - 1).arraySync().map(Math.floor);

                    // Using list comprehension to sample from replay buffer
                    let state_sample = indices.map(i => state_history[i].expandDims());
                    let state_next_sample = indices.map(i => state_next_history[i].expandDims());
                    let rewards_sample = tf.tensor1d(
                        indices.map(i => rewards_history[i])
                    );
                    let action_sample = indices.map(i => action_history[i]);

                    let done_sample = tf.tensor1d(
                        indices.map(i => done_history[i])
                    );
                    // Build the updated Q-values for the sampled future states
                    // Use the target model for stabilitys

                    let future_rewards = gameAgent.modelTarget.predict(tf.concat(state_next_sample));
                    
                    
                    
                    // Q value = reward + discount factor * expected future reward
                    let updated_q_values = rewards_sample.add(tf.max(future_rewards, 1).mul(tf.scalar(gamma)));
                    
                    // If final frame set the last value to -1
                    updated_q_values = updated_q_values.mul(tf.scalar(1).sub(done_sample)).sub(done_sample);
                    // Create a mask so we only calculate loss on the updated Q-values
                    let masks = tf.oneHot(action_sample, num_actions);
                    // Train the model on the states and updated Q-values
                    let q_values = gameAgent.model.predict(tf.concat(state_sample));
                    // Apply the masks to the Q-values to get the Q-value for action taken
                    let q_action = tf.sum(tf.mul(q_values, masks), 1);
                    // Calculate loss between new Q-value and old Q-value

                    let hubberLoss = tf.losses.huberLoss(updated_q_values, q_action);
                    return hubberLoss;
                };

                // Backpropagation
                
                let grads = tf.variableGrads(loss);

                optimizer.applyGradients(grads.grads);
            }
            
            if(frame_count % update_target_network == 0) {
                // update the the target network with new weights
                gameAgent.modelTarget.setWeights(gameAgent.model.getWeights());
                // Log details
                console.log("running reward: "+ episode_reward + "  at episode " + episode_count + ", frame count " + frame_count + " score : " + game.getScores());
            }

            // Limit the state and reward history
            if(rewards_history.length > max_memory_length) {
                rewards_history.shift();
                state_history.shift();
                state_next_history.shift();
                action_history.shift();
                done_history.shift();
            }

            if (done) {
                break;
            }
        }

        // Update running reward to check condition for solving
        episode_reward_history.push(episode_reward);
        
        if(episode_reward_history.length > 100){
            episode_reward_history.shift();
        }

        episode_count += 1;
    }
}

main();
