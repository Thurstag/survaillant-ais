/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs";
import { ArgumentParser } from "argparse";
import { array, AUTO_ARGUMENT_VALUE, autoOr, int, path } from "../common/argparse.js";
import { Representation } from "../common/game/environment/state/tensor.js";
import { RewardPolicy } from "../common/game/environment/reward.js";
import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";
import { Generator } from "../common/game/environment/state/states.js";

import { train } from "./train.js";

import LOGGER from "../common/logger.js";

const REFER_STATE_README = "Please refer to the 'State generator' section of README.md for more information";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DQN model that plays Survaillant."
    });
    parser.add_argument("--width", {
        default: AUTO_ARGUMENT_VALUE,
        type: autoOr(int),
        help: `Maximum map's width that the network can take in input. If ${AUTO_ARGUMENT_VALUE} is specified, it will be width of the widest map of the training maps (${REFER_STATE_README})`
    });
    parser.add_argument("--height", {
        default: AUTO_ARGUMENT_VALUE,
        type: autoOr(int),
        help: `Maximum map's height that the network can take in input. If ${AUTO_ARGUMENT_VALUE} is specified, it will be height of the tallest map of the training maps (${REFER_STATE_README})`
    });
    parser.add_argument("--backend", {
        default: BACKEND.NONE.toLowerCase(),
        type: "str",
        choices: Object.values(BACKEND).map(v => v.toLowerCase()),
        help: "Backend to use for tensorflow (CPU, GPU, NONE)"
    });
    parser.add_argument("--epoch", {
        type: "int",
        required: true,
        help: "Number of epochs to run"
    });
    parser.add_argument("--epsilonRandomFrames", {
        type: "int",
        default: 0,
        help: "Number of frames to take random action and observe output."
    });
    parser.add_argument("--epsilonGreedyFrames", {
        type: "float",
        default: 0,
        help: "Number of frames for exploration."
    });
    parser.add_argument("--maxMemoryLength", {
        type: "int",
        default: 10000,
        help: "Max memory to limit array size."
    });
    parser.add_argument("--updateAfterNbActions", {
        type: "int",
        default: 4,
        help: "Number of actions before training the model."
    });
    parser.add_argument("--updateTargetNetwork", {
        type: "int",
        default: 200,
        help: "How often to update the target network"
    });
    parser.add_argument("--batchSize", {
        type: "int",
        default: 16,
        help: "Batch size for DQN training."
    });
    parser.add_argument("--gamma", {
        type: "float",
        default: 0.99,
        help: "Reward discount rate."
    });
    parser.add_argument("--maxStepsPerEpisode", {
        type: "int",
        default: 10000,
        help: "Max steps per episodes."
    });
    parser.add_argument("--savePath", {
        type: path,
        required: true,
        help: "File path to which the online DQN will be saved after training."
    });
    parser.add_argument("--epsilonMin", {
        type: "float",
        default: 0.1,
        help: "Epsilon min value"
    });
    parser.add_argument("--epsilonMax", {
        type: "float",
        default: 1,
        help: "Epsilon max value"
    });
    parser.add_argument("--epsilon", {
        type: "float",
        default: 0.2,
        help: "Epsilon max value"
    });
    parser.add_argument("--maps", {
        type: array(path => {
            if (!fs.existsSync(path)) {
                throw new Error(`${path} doesn't exist`);
            }
            return path;
        }),
        required: true,
        help: "A list of paths to map files separated by a ',' used for training (e.g: ./src/survaillant/assets/dungeons/aPotato/info.json)"
    });
    parser.add_argument("--representation", {
        type: "str",
        choices: Object.values(Representation).map(r => r.toLowerCase()),
        required: true,
        help: "Representation of the game's state ( " + REFER_STATE_README + ")"
    });
    parser.add_argument("--policy", {
        type: "str",
        choices: Object.values(RewardPolicy).map(r => r.toLowerCase()),
        required: true,
        help: "Reward policy to use ( " + REFER_STATE_README + ")"
    });
    parser.add_argument("--state", {
        type: "str",
        choices: Object.values(Generator).map(g => g.toLowerCase()),
        required: true,
        help: `Mode used to generate game's state (${REFER_STATE_README})`
    });
    parser.add_argument("--stats", {
        type: path,
        required: false,
        help: "Path to a folder where training statistics will be saved"
    });
    parser.add_argument("--radius", {
        type: "int",
        default: 0,
        required: false,
        help: "Radius for flashlight"
    });
    parser.add_argument("--baseNetworkFolder", {
        type: path,
        required: false,
        help: "Path to a folder containing networks (actor.sm and critic.sm) to train"
    });

    return parser.parse_args();
}

/**
 * Script entry point
 */
async function main() {

    // Parse arguments
    const args = parseArguments();

    // Load backend from args
    await loadTfBackend(args.backend.toUpperCase());

    await train(args);
}

main().catch(LOGGER.exceptions);