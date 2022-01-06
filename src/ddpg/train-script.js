/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import LOGGER from "../common/logger.js";
import { ITEMS_MESSAGE, REFER_POLICIES_MESSAGE, REFER_STATE_MESSAGE } from "../common/readme.js";
import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";
import { ArgumentDefaultsHelpFormatter, ArgumentParser } from "argparse";
import { Argument, train } from "./train.js";
import { array, AUTO_ARGUMENT_VALUE, autoOr, int, path } from "../common/argparse.js";
import fs from "fs";
import { RewardPolicy } from "../common/game/environment/reward.js";
import { Generator } from "../common/game/environment/state/states.js";
import { Representation } from "../common/game/environment/state/tensor.js";
import { DdpgDefaultHyperparameter as DefaultHyperparameter, DdpgHyperparameterInfo as HyperparameterInfo } from "./hyperparameters.js";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DDPG model that plays Survaillant. This script trains two networks: the critic network and the actor network. " +
            "The actor network is the network that gives the probability to make a decision",
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
        help: `Reward policy to use (${REFER_POLICIES_MESSAGE})`
    });
    parser.add_argument(`--${Argument.STATE_MODE}`, {
        type: "str",
        choices: Object.values(Generator).map(g => g.toLowerCase()),
        required: true,
        help: `Mode used to generate game's state (${REFER_STATE_MESSAGE})`
    });
    parser.add_argument(`--${Argument.FLASHLIGHT_RADIUS}`, {
        default: 3,
        type: "int",
        required: false,
        help: `Radius used in flashlight mode (${REFER_STATE_MESSAGE})`
    });
    parser.add_argument(`--${Argument.NORMAL_MAP_WIDTH}`, {
        default: AUTO_ARGUMENT_VALUE,
        type: autoOr(int),
        required: false,
        help: `Maximum map's width that the network can take in input. If ${AUTO_ARGUMENT_VALUE} is specified, it will be width of the widest map of the training maps (${REFER_STATE_MESSAGE})`
    });
    parser.add_argument(`--${Argument.NORMAL_MAP_HEIGHT}`, {
        default: AUTO_ARGUMENT_VALUE,
        type: autoOr(int),
        required: false,
        help: `Maximum map's height that the network can take in input. If ${AUTO_ARGUMENT_VALUE} is specified, it will be height of the tallest map of the training maps (${REFER_STATE_MESSAGE})`
    });
    parser.add_argument(`--${Argument.REPRESENTATION}`, {
        type: "str",
        choices: Object.values(Representation).map(r => r.toLowerCase()),
        required: true,
        help: "Representation of the game's state (" + REFER_STATE_MESSAGE + ")"
    });
    parser.add_argument(`--${Argument.ITEMS}`, {
        action: "store_true",
        help: ITEMS_MESSAGE
    });
    parser.add_argument(`--${Argument.NETWORK_FOLDER}`, {
        type: path,
        required: true,
        help: "Path to a folder where actor and critic networks will be saved"
    });
    parser.add_argument(`--${Argument.NETWORK_SAVE_FREQUENCY}`, {
        default: 50,
        type: "int",
        required: false,
        help: `Frequency at which networks are saved. Example: ${Argument.NETWORK_SAVE_FREQUENCY}=25, networks are saved every 25 epochs`
    });

    parser.add_argument(`--${Argument.STATS_FOLDER}`, {
        type: path,
        required: false,
        help: "Path to a folder where training statistics will be saved"
    });
    parser.add_argument(`--${Argument.BACKEND}`, {
        default: BACKEND.NONE.toLowerCase(),
        type: "str",
        choices: Object.values(BACKEND).map(v => v.toLowerCase()),
        required: false,
        help: "Tensorflow backend to use"
    });
    parser.add_argument(`--${Argument.BASE_NETWORK_FOLDER}`, {
        type: path,
        required: false,
        help: "Path to a folder containing networks (actor.sm and critic.sm) to train"
    });
    parser.add_argument(`--${Argument.TURNS_LIMIT}`, {
        default: 1234,
        type: "int",
        required: false,
        help: "Maximum number of turns that can be done during training"
    });

    for (const [ name, value ] of Object.entries(DefaultHyperparameter)) {
        const isInteger = Number.isInteger(value);

        parser.add_argument(`--${name.toLowerCase()}`, {
            dest: name,
            default: value,
            type: isInteger ? "int" : "float",
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

    // Train network
    await train(args);
}

main()
    .catch(LOGGER.exception);

