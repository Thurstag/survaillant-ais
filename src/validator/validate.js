/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentDefaultsHelpFormatter, ArgumentParser } from "argparse";
import fs from "fs";
import { join, sep } from "path";
import ProgressBar from "progress";
import { array, path } from "../common/argparse.js";
import { SingleMapEnvironment, SingleMapEnvironmentWithItems } from "../common/game/environment/environments.js";
import loadFrom from "../common/game/environment/importer.js";
import { GamesStats } from "../common/game/stats.js";
import { TrainingInformationKey } from "../common/game/training.js";
import LOGGER from "../common/logger.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";
import { BACKEND, load as loadTfBackend } from "../common/tensorflow/node/backend-loader.js";
import { POLICY_NETWORK_NAME } from "../ppo/networks.js";
import Map from "../survaillant/src/models/games/Map.js";
import tf from "@tensorflow/tfjs";

const Argument = {
    MAPS: "maps",
    NETWORK: "network",
    BACKEND: "backend",
    GAMES: "games",
    STATS_FOLDER: "stats",
    TURNS_LIMIT: "turns_limit"
};

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const TURNS_LIMIT = 1111;

    const parser = new ArgumentParser({
        description: "Validation script, it loads the network that can take decisions and makes it play on the given maps",
        formatter_class: ArgumentDefaultsHelpFormatter
    });

    parser.add_argument(`--${Argument.NETWORK}`, {
        type: path,
        required: false,
        help: `Path to a network to validate (e.g: For a PPO network, it's the path to ${POLICY_NETWORK_NAME}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION})`
    });
    parser.add_argument(`--${Argument.MAPS}`, {
        type: array(path => {
            if (!fs.existsSync(path)) {
                throw new Error(`${path} doesn't exist`);
            }
            return path;
        }),
        required: true,
        help: "A list of paths to map files separated by a ',' used for validation (e.g: ./src/survaillant/assets/dungeons/aPotato/info.json)"
    });
    parser.add_argument(`--${Argument.GAMES}`, {
        type: "int",
        required: true,
        help: "Number of games to run for each map"
    });

    parser.add_argument(`--${Argument.STATS_FOLDER}`, {
        type: path,
        required: false,
        help: "Path to a folder where games statistics will be saved"
    });
    parser.add_argument(`--${Argument.TURNS_LIMIT}`, {
        default: TURNS_LIMIT,
        type: "int",
        required: false,
        help: `Limit of the number of turns in a game. If the game isn't finished in ${Argument.TURNS_LIMIT} turns, the game over reason is undefined`
    });
    parser.add_argument(`--${Argument.BACKEND}`, {
        default: BACKEND.CPU.toLowerCase(),
        type: "str",
        choices: [ BACKEND.CPU, BACKEND.GPU ].map(v => v.toLowerCase()),
        required: false,
        help: "Tensorflow backend to use"
    });

    return parser.parse_args();
}

/**
 * Script entry point
 */
async function main() {
    const args = parseArguments();

    // Load backend
    await loadTfBackend(args[Argument.BACKEND].toUpperCase());

    // Load maps
    const maps = args[Argument.MAPS].map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    // Load network, state generator...
    let networkFolder = args[Argument.NETWORK];
    const { network, policy, stateGenerator, trainingInfo } = await loadFrom(`file://${networkFolder}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`,
        join(networkFolder, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME), fs.readFileSync);

    const games = args[Argument.GAMES];
    const turnsLimit = args[Argument.TURNS_LIMIT];

    // Run maps
    const stats = new GamesStats();
    for (const map of maps) {
        const env = trainingInfo.env.items?.type === "fullList" ?
            new SingleMapEnvironmentWithItems(map, policy, stateGenerator) :
            new SingleMapEnvironment(map, policy, stateGenerator);

        const progress = new ProgressBar(`Playing '${map.name}' [:bar] :rate/gps :percent :etas`, { total: games, complete: "=", incomplete: " ", width: 20 });

        // Pay games
        for (let i = 0; i < games; i++) {
            env.reset();

            let j;
            for (j = 0; j < turnsLimit; j++) {
                // Ask network its prediction

                const action = tf.tidy(() => {
                    const state = env.state();

                    if (trainingInfo.env.state.flattend) {
                        // Get the sate shape
                        let dimensionToReduce = (state.shape.reduce((accu, current) => accu * current, 1));
                        return network.predict(state.reshape([ dimensionToReduce ]).expandDims()).dataSync()[0];
                    }
                    else return network.predict(state.expandDims()).dataSync()[0];
                });

                if (env.step(action).done) {
                    break;
                }
            }
            if (j >= turnsLimit) {
                env.stats.add(env.game.stats);
            }

            progress.tick();
        }
        stats.addAll(env.stats);

        LOGGER.info(`'${map.name}' statistics: ${JSON.stringify(env.stats.summary())}`);
    }

    // Export statistics
    const statsFile = join(args[Argument.STATS_FOLDER], `${trainingInfo[TrainingInformationKey.ID]}_validation[${maps.map(m => m.name)}].csv`);
    await stats.writeTo(statsFile);
    LOGGER.info(`Validation statistics saved in ${statsFile}`);
}

main()
    .catch(LOGGER.exception);
