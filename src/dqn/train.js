/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import { parse } from "querystring";
import * as tf from '@tensorflow/tfjs';

import { SurvaillantGameAgent } from './survaillant_game_agent'

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DQN model that plays Survaillant."
    });
    parse.addArgument('--gpu', {
        type: 'boolean',
        defaultValue: false,
        help: 'Option to use GPU', 
    });
    parser.addArgument('--height', {
        type: 'int',
        defaultValue: 20,
        help: 'Height of the game board.'
    });
        parser.addArgument('--width', {
        type: 'int',
        defaultValue: 20,
        help: 'Width of the game board.'
    })
    parser.addArgument('--actions', {
        type: 'float',
        defaultValue: 4,
        help: 'Number of actions to provide'
      });
    parser.addArgument('--maxNumFrames', {
        type: 'float',
        defaultValue: 1e6,
        help: 'Maximum number of frames to run durnig the training. ' +
        'Training ends immediately when this frame count is reached.'
    });
    parser.addArgument('--replayBufferSize', {
        type: 'int',
        defaultValue: 1e4,
        help: 'Length of the replay memory buffer.'
      });
      parser.addArgument('--epsilonInit', {
        type: 'float',
        defaultValue: 0.5,
        help: 'Initial value of epsilon, used for the epsilon-greedy algorithm.'
      });
      parser.addArgument('--epsilonFinal', {
        type: 'float',
        defaultValue: 0.01,
        help: 'Final value of epsilon, used for the epsilon-greedy algorithm.'
      });
      parser.addArgument('--epsilonDecayFrames', {
        type: 'int',
        defaultValue: 1e5,
        help: 'Number of frames of game over which the value of epsilon ' +
        'decays from epsilonInit to epsilonFinal'
      });
      parser.addArgument('--batchSize', {
        type: 'int',
        defaultValue: 64,
        help: 'Batch size for DQN training.'
      });
      parser.addArgument('--gamma', {
        type: 'float',
        defaultValue: 0.99,
        help: 'Reward discount rate.'
      });
      parser.addArgument('--learningRate', {
        type: 'float',
        defaultValue: 1e-3,
        help: 'Learning rate for DQN training.'
      });
      parser.addArgument('--syncEveryFrames', {
        type: 'int',
        defaultValue: 1e3,
        help: 'Frequency at which weights are sync\'ed from the online network ' +
        'to the target network.'
      });
      parser.addArgument('--savePath', {
        type: 'string',
        defaultValue: './models/dqn',
        help: 'File path to which the online DQN will be saved after training.'
      });
    return parser.parse_args();
}

/**
 * Script entry point
 */
function main() {
    // Parse arguments
    const args = parseArguments();

    if (args.gpu) {
        tf = require('@tensorflow/tfjs-node-gpu');
    } else {
        tf = require('@tensorflow/tfjs-node');
    }   

    const game = new SurvaillantGame();  

    const gameAgent = new SurvaillantGameAgent(game, {
        height: args.height,
        width: args.width,
        actions: args.actions
    });

    await train(gameAgent, args);  
}

/**
 * Train function for agent
 * 
 * @param {*} gameAgent
 * @param {*} config 
 */
async function train(config) {
        
        let optimizer = tf.train.adam(0.00025);

        let max_memory_length = 100000;

        let update_target_network = 10000;

        let action = -1;

        let frame_count = 0;

        let epsilon = config.epsilonInit;

        let epsilon_min = 0.1;
        let epsilon_max = 1.0;
        let epsilon_interval = epsilon_max - epsilon_min;
    
        while(true) {

            gameAgent.restart();
            let reward = 0;

            for(let i = 0; i < maxSteps; i++) {
                
                frame_count += 1;

                if(frame_count < epsilon_random_frames || epsilon > Math.random()) {
                    action = Math.floor(Math.random() * config.actions);
                } else {
                    action = 2; //TODO
                }

                epsilon -= epsilon_interval / epsilon_greedy_frames;
                epsilon = Math.max(epsilon, epsilon_min);

                //TODO STEP

                //TODO SAVE ACTION
                //TODO SAVE STATE

            }
        }
}

main();
