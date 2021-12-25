/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import fs from "fs";
import { join, sep } from "path";
import { array, AUTO_ARGUMENT_VALUE, autoOr, int, path } from "../common/argparse.js";

import { ListMapEnvironment, SingleMapEnvironment } from "../common/game/environment/environments.js";
import { Representation } from "../common/game/environment/state/tensor.js";
import { createPolicy, RewardPolicy } from "../common/game/environment/reward.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "../common/game/environment/state/states.js";
import { GamesStats } from "../common/game/stats.js";

import { SurvaillantDQNAgent } from "./agent.js";
import Map from "../survaillant/src/models/games/Map.js";

import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";

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
        default: 1000,
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

    return parser.parse_args();
}

/**
 * Script entry point
 */
async function main() {

    // Parse arguments
    const args = parseArguments();

    await loadTfBackend(args.backend.toUpperCase());

    const maps = args.maps.map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    const representation = EntitiesRepresentation[args.representation.toUpperCase()];

    const stateGenerator = (() => {
        const mode = args.state.toUpperCase();

        switch (mode) {
            case Generator.FLASHLIGHT:
                if(args.radius == 0) {
                    throw new Error("Radius should be define != 0 when flashlight state is used");
                }
                return new FlashlightStateGenerator(args.radius, representation);

            case Generator.NORMAL: {
                const width = args.width;
                const height = args.height;

                const autoWidth = width === AUTO_ARGUMENT_VALUE;
                const autoHeight = height === AUTO_ARGUMENT_VALUE;
                if (autoWidth || autoHeight) {
                    const [ maxWidth, maxHeight ] = maps.reduce((a, m) => {
                        a[0] = Math.max(a[0], m.board.dimX);
                        a[1] = Math.max(a[1], m.board.dimY);

                        return a;
                    }, [ 0, 0 ]);

                    return new NormalStateGenerator(autoWidth ? maxWidth : width, autoHeight ? maxHeight : height, representation);
                } else {
                    return new NormalStateGenerator(width, height, representation);
                }
            }

            default:
                throw new Error("Unknown state mode: " + mode);
        }
    })();

    let rewardPolicy = createPolicy(args.policy.toUpperCase());

    // Create env
    const env = maps.length === 1 ? new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator) : new ListMapEnvironment(maps, rewardPolicy, stateGenerator);

    // Create agent
    const agent = new SurvaillantDQNAgent(args, env);

    // Launch train
    const [ id, statsPerEpoch ] = await agent.train(async (epoch, metadata, network) => { 
        try {
            await network.saveTo(name => `${args.savePath}${sep}${name}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`, metadata, "file");
            LOGGER.info(`Saved in ${args.savePath} : Max ${epoch}`);
        } catch (e) {
            LOGGER.error(`Unable to save networks. Cause: ${e.stack}`);
        }
    });

    const statsFolder = args.stats;
    if (statsFolder !== undefined && statsFolder !== null) {
        const statsFile = join(statsFolder, id + ".csv");

        await GamesStats.writeTo(statsPerEpoch, statsFile);
        LOGGER.info(`Training statistics saved in ${statsFile}`);
    }
}

main().catch(LOGGER.exceptions);
