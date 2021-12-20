/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import fs from "fs";
import { join, sep } from "path";
import { array, path } from "../common/argparse.js";

import { ListMapEnvironment, SingleMapEnvironment } from "../common/game/environment/environments.js";
import { FlashlightStateGenerator } from "../common/game/environment/state/states.js";
import { Representation } from "../common/game/environment/state/tensor.js";
import { createPolicy, RewardPolicy } from "../common/game/environment/reward.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";

import SurvaillantGameAgent from "./agent.js";
import Map from "../survaillant/src/models/games/Map.js";

import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";

import LOGGER from "../common/logger.js";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DQN model that plays Survaillant."
    });
    parser.add_argument("--height", {
        type: "int",
        default: 9,
        help: "Height of the game board."
    });
    parser.add_argument("--width", {
        type: "int",
        default: 9,
        help: "Width of the game board."
    });
    parser.add_argument("--epoch", {
        type: "int",
        required: true,
        help: "Number of epochs to run"
    });
    parser.add_argument("--espilonRandomFrames", {
        type: "int",
        default: 50000,
        help: "Number of frames to take random action and observe output."
    });
    parser.add_argument("--espilonGreedyFrames", {
        type: "float",
        default: 1000000.0,
        help: "Number of frames for exploration."
    });
    parser.add_argument("--maxMemoryLength", {
        type: "int",
        default: 100000,
        help: "Max memory to limit array size."
    });
    parser.add_argument("--updateAfterNbActions", {
        type: "int",
        default: 4,
        help: "Number of actions before training the model."
    });
    parser.add_argument("--updateTargetNetwork", {
        type: "int",
        default: 1000,
        help: "How often to update the target network"
    });
    parser.add_argument("--batchSize", {
        type: "int",
        default: 32,
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
        type: "str",
        default: "./models/dqn",
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
        help: "Representation of the game's state ()"
    });
    parser.add_argument("--policy", {
        type: "str",
        choices: Object.values(RewardPolicy).map(r => r.toLowerCase()),
        required: true,
        help: "Reward policy to use (Please refer to the 'Reward policies' section of README.md for more information)"
    });
    parser.add_argument("--stats", {
        type: path,
        required: false,
        help: "Path to a folder where training statistics will be saved"
    });

    return parser.parse_args();
}

/**
 * Script entry point
 */
async function main() {

    // Parse arguments
    const args = parseArguments();

    await loadTfBackend(BACKEND.CPU);

    const maps = args.maps.map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    const representation = EntitiesRepresentation[args.representation.toUpperCase()];

    const stateGenerator = new FlashlightStateGenerator(4, representation);
    let rewardPolicy = createPolicy(args.policy.toUpperCase());

    // Create env
    const env = maps.length === 1 ? new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator) : new ListMapEnvironment(maps, rewardPolicy, stateGenerator);

    // Create agent
    const agent = new SurvaillantGameAgent(args, env);

    // Launch train
    await agent.train(async (epoch, metadata, network) => {
        try {
            await network.saveTo(name => `.${sep}${name}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`, metadata, "file");
        } catch (e) {
            LOGGER.error(`Unable to save networks. Cause: ${e.stack}`);
        }
    });

    const statsFolder = args.stats;
    if (statsFolder !== undefined && statsFolder !== null) {
        const statsFile = join(statsFolder, "DQN.csv");
        await env.stats.writeTo(statsFile);
        LOGGER.info(`Training statistics saved in ${statsFile}`);
    }
}

main().catch(LOGGER.exception);
