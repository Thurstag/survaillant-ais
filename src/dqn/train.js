/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";

import SurvaillantGameAgent from "./agent.js";

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
        defaultValue: 9,
        help: "Height of the game board."
    });
    parser.addArgument("--width", {
        type: "int",
        defaultValue: 9,
        help: "Width of the game board."
    });
    parser.addArgument("--actions", {
        type: "float",
        defaultValue: 4,
        help: "Number of actions to provide"
    });
    parser.addArgument("--espilonRandomFrames", {
        type: "int",
        defaultValue: 50000,
        help: "Number of frames to take random action and observe output."
    });
    parser.addArgument("--espilonGreedyFrames", {
        type: "float",
        defaultValue: 1000000.0,
        help: "Number of frames for exploration."
    });
    parser.addArgument("--maxMemoryLength", {
        type: "int",
        defaultValue: 100000,
        help: "Initial value of epsilon, used for the epsilon-greedy algorithm."
    });
    parser.addArgument("--updateAfterNbActions", {
        type: "int",
        defaultValue: 4,
        help: "Number of actions before training the model."
    });
    parser.addArgument("--updateTargetNetwork", {
        type: "int",
        defaultValue: 10000,
        help: "How often to update the target network"
    });
    parser.addArgument("--batchSize", {
        type: "int",
        defaultValue: 32,
        help: "Batch size for DQN training."
    });
    parser.addArgument("--gamma", {
        type: "float",
        defaultValue: 0.99,
        help: "Reward discount rate."
    }) ;
    parser.addArgument("--maxStepsPerEpisode", {
        type: "int",
        defaultValue: 10000,
        help: "Max steps per episodes."
    });
    parser.addArgument("--savePath", {
        type: "string",
        defaultValue: "./models/dqn",
        help: "File path to which the online DQN will be saved after training."
    });
    parser.addArgument("--epsilonMin", {
        type: "float",
        defaultValue: 0.1,
        help: "Epsilon min value"
    });
    parser.addArgument("--epsilonMax", {
        type: "float",
        defaultValue: 1,
        help: "Epsilon max value"
    });
    parser.addArgument("--epsilon", {
        type: "float",
        defaultValue: 0.5,
        help: "Epsilon max value"
    });

    return parser.parse_args();
}

/**
 * Script entry point
 */
function main() {

    // Parse arguments
    const args = parseArguments();  

    // Create agent
    const agent = new SurvaillantGameAgent(args);

    // Launch train
    agent.train();  
}

main();
