/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentDefaultsHelpFormatter, ArgumentParser } from "argparse";
import fs from "fs";
import { join, sep } from "path";
import { array, path } from "../common/argparse.js";
import { SingleMapEnvironment } from "../common/game/environment/environments.js";
import { createPolicy, RewardPolicy } from "../common/game/environment/reward.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "../common/game/environment/state/states.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";
import LOGGER from "../common/logger.js";
import SurvaillantNetwork from "../common/network.js";
import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";
import Map from "../survaillant/src/models/games/Map.js";
import { PpoAgent } from "./agent.js";
import { PpoDefaultHyperparameter as DefaultHyperparameter, PpoHyperparameter as Hyperparameter, PpoHyperparameterInfo as HyperparameterInfo } from "./hyperparameters.js";
import { fromNetworks, POLICY_NETWORK_NAME, random, VALUE_NETWORK_NAME } from "./networks.js";

const Argument = {
    BACKEND: "backend",
    MAPS: "maps",
    POLICY: "policy",
    STATS_FOLDER: "statistics_folder",
    NETWORK_FOLDER: "network_folder",
    EPOCHS: "epochs",
    BASE_NETWORK_FOLDER: "base_network_folder",
    REPRESENTATION: "representation",
    STATE_MODE: "state_mode"
};

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a PPO model that plays Survaillant. This script trains two networks: the value network and the policy network. " +
            "The policy network is the network that gives the probability to make a decision",
        formatter_class: ArgumentDefaultsHelpFormatter
    });

    parser.add_argument(`--${Argument.MAPS}`, {
        type: array(path => {
            if (!fs.existsSync(path)) {
                throw new Error(`${path} doesn't exist`);
            }
            return path;
        }),
        required: true,
        help: "A list of paths to map files separated by a ',' used for training (e.g: ./src/survaillant/assets/dungeons/aPotato/info.json)"
    });
    parser.add_argument(`--${Argument.EPOCHS}`, {
        type: "int",
        required: true,
        help: "Number of epochs to run"
    });
    parser.add_argument(`--${Argument.POLICY}`, {
        type: "str",
        choices: Object.values(RewardPolicy).map(r => r.toLowerCase()),
        required: true,
        help: "Reward policy to use (Please refer to the 'Reward policies' section of README.md for more information)"
    });
    parser.add_argument(`--${Argument.STATE_MODE}`, {
        type: "str",
        choices: Object.values(Generator).map(g => g.toLowerCase()),
        required: true,
        help: "Mode used to generate game's state (Please refer to the 'State generator' section of README.md for more information)"
    });
    parser.add_argument(`--${Argument.REPRESENTATION}`, {
        type: "str",
        choices: Object.keys(EntitiesRepresentation).map(r => r.toLowerCase()),
        required: true,
        help: "Representation of the game's state (Please refer to the 'State generator' section of README.md for more information)"
    });
    parser.add_argument(`--${Argument.NETWORK_FOLDER}`, {
        type: path,
        required: true,
        help: "Path to a folder where value and policy networks will be saved"
    });

    parser.add_argument(`--${Argument.STATS_FOLDER}`, {
        type: path,
        required: false,
        help: "Path to a folder where training statistics will be saved"
    });
    parser.add_argument(`--${Argument.BACKEND}`, {
        default: BACKEND.NONE,
        type: "str",
        choices: Object.values(BACKEND).map(v => v.toLowerCase()),
        required: false,
        help: "Tensorflow backend to use"
    });
    parser.add_argument(`--${Argument.BASE_NETWORK_FOLDER}`, {
        type: path,
        required: false,
        help: "Path to a folder containing networks (value.sm and policy.sm) to train"
    });
    for (const [ name, value ] of Object.entries(DefaultHyperparameter)) {
        const isArray = Array.isArray(value);
        const isInteger = Number.isInteger(value);

        parser.add_argument(`--${name.toLowerCase()}`, {
            dest: name,
            default: isArray ? value.join(",") : value,
            type: isArray ? array(Number.parseInt) : (isInteger ? "int" : "float"),
            required: false,
            help: HyperparameterInfo[name]
        });
    }

    return parser.parse_args();
}

/**
 * Script entry point
 */
async function main() {
    // Parse arguments
    const args = parseArguments();

    // Load backend
    await loadTfBackend(args[Argument.BACKEND].toUpperCase());

    // Display hyperparameters
    LOGGER.info(`Hyperparameters:\n${Object.keys(DefaultHyperparameter).map(name => `${name}: ${args[name]}`).join("\n")}`);

    // Load maps
    const maps = args[Argument.MAPS].map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    // Create reward policy
    let rewardPolicy = createPolicy(args[Argument.POLICY].toUpperCase());

    // Select the representation
    const representation = EntitiesRepresentation[args[Argument.REPRESENTATION].toUpperCase()];

    // Create state generator
    const stateGenerator = (() => {
        let mode = args[Argument.STATE_MODE].toUpperCase();

        switch (mode) {
            case Generator.FLASHLIGHT:
                return new FlashlightStateGenerator(3, representation);

            case Generator.NORMAL:
                return new NormalStateGenerator(maps.reduce((a, m) => Math.max(a, m.board.dimX), 0), maps.reduce((a, m) => Math.max(a, m.board.dimY), 0), representation);

            default:
                throw new Error("Unknown state mode: " + mode);
        }
    })();

    // Create environment
    const env = (() => {
        if (maps.length === 1) {
            return new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator);
        } else {
            throw new Error("Training on multiple maps isn't implemented");
        }
    })();
    const stateShape = env.stateShape;

    // Create network
    const networkImportFolder = args[Argument.BASE_NETWORK_FOLDER];
    let network;
    if (networkImportFolder === undefined || networkImportFolder === null) {
        network = random(stateShape.x, stateShape.y, stateShape.z, args[Hyperparameter.HIDDEN_LAYER_UNITS], args[Hyperparameter.POLICY_LEARNING_RATE], args[Hyperparameter.VALUE_LEARNING_RATE]);
    } else {
        network = await fromNetworks(`file://${networkImportFolder}${sep}${POLICY_NETWORK_NAME}${SurvaillantNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantNetwork.MODEL_FILENAME}`,
            `file://${networkImportFolder}${sep}${VALUE_NETWORK_NAME}${SurvaillantNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantNetwork.MODEL_FILENAME}`,
            args[Hyperparameter.POLICY_LEARNING_RATE], args[Hyperparameter.VALUE_LEARNING_RATE]);
    }
    network.printSummary();

    // Train network
    const networkExportFolder = args[Argument.NETWORK_FOLDER];
    const agent = new PpoAgent(args[Argument.EPOCHS], args[Hyperparameter.STEPS_PER_EPOCH], args[Hyperparameter.TRAIN_POLICY_ITERATIONS], args[Hyperparameter.TRAIN_VALUE_ITERATIONS],
        args[Hyperparameter.TARGET_KL], args[Hyperparameter.CLIP_RATIO], args[Hyperparameter.GAMMA], args[Hyperparameter.LAM]);
    const id = await agent.train(network, env, async (epoch, network) => {
        try {
            await network.saveTo(name => `file://${networkExportFolder}${sep}${name}${SurvaillantNetwork.SAVED_MODEL_EXTENSION}`);
            // TODO: Save training metadata
            LOGGER.info(`[Epoch ${epoch}] Networks were saved in ${networkExportFolder}`);
        } catch (e) {
            LOGGER.error(`Unable to save networks. Cause: ${e.stack}`);
        }
    });
    LOGGER.info("Training id is: " + id);

    // Export statistics
    const statsFolder = args[Argument.STATS_FOLDER];
    if (statsFolder !== undefined && statsFolder !== null) {
        const statsFile = join(statsFolder, id + ".csv");
        await env.stats.writeTo(statsFile);
        LOGGER.info(`Training statistics saved in ${statsFile}`);
    }
}

// TODO: Add tests

main()
    .catch(LOGGER.exception);
