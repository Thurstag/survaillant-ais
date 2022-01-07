/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs";
import { join, sep } from "path";
import { AUTO_ARGUMENT_VALUE } from "../common/argparse.js";
import { ListMapEnvironment, SingleMapEnvironment } from "../common/game/environment/environments.js";
import { createPolicy } from "../common/game/environment/reward.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "../common/game/environment/state/states.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";
import { GamesStats } from "../common/game/stats.js";
import LOGGER from "../common/logger.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";
import Map from "../survaillant/src/models/games/Map.js";
import { DdpgAgent } from "./agent.js";
import { DdpgHyperparameter as Hyperparameter } from "./hyperparameters.js";
import { ACTOR_NETWORK_NAME, CRITIC_NETWORK_NAME, fromNetworks, random } from "./networks.js";

const Argument = {
    BACKEND: "backend",
    MAPS: "maps",
    POLICY: "policy",
    STATS_FOLDER: "statistics_folder",
    NETWORK_FOLDER: "network_folder",
    NETWORK_SAVE_FREQUENCY: "network_save_frequency",
    EPOCHS: "epochs",
    BASE_NETWORK_FOLDER: "base_network_folder",
    REPRESENTATION: "representation",
    STATE_MODE: "state_mode",
    FLASHLIGHT_RADIUS: "flashlight_radius",
    NORMAL_MAP_WIDTH: "input_map_width",
    NORMAL_MAP_HEIGHT: "input_map_height"
};

/**
 * Launch DDPG training based on the given arguments (arguments are the script's arguments)
 *
 * @param {Object<String, *>} args Arguments
 * @return {Promise<void>} Promise
 */
async function train(args) {
    // Load maps
    const maps = args[Argument.MAPS].map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    // Create reward policy
    let rewardPolicy = createPolicy(args[Argument.POLICY].toUpperCase());

    // Select the representation
    const representation = EntitiesRepresentation[args[Argument.REPRESENTATION].toUpperCase()];

    // Create state generator
    const stateGenerator = (() => {
        const mode = args[Argument.STATE_MODE].toUpperCase();

        switch (mode) {
            case Generator.FLASHLIGHT:
                return new FlashlightStateGenerator(args[Argument.FLASHLIGHT_RADIUS], representation);

            case Generator.NORMAL: {
                const width = args[Argument.NORMAL_MAP_WIDTH];
                const height = args[Argument.NORMAL_MAP_HEIGHT];

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

    // Create environment
    const env = maps.length === 1 ? new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator) : new ListMapEnvironment(maps, rewardPolicy, stateGenerator);
    const stateShape = env.stateShape;

    // Create network
    const networkImportFolder = args[Argument.BASE_NETWORK_FOLDER], actorLearningRate = args[Hyperparameter.ACTOR_LEARNING_RATE],
        criticLearningRate = args[Hyperparameter.CRITIC_LEARNING_RATE];
    let network;
    if (networkImportFolder === undefined || networkImportFolder === null) {
        network = random(stateShape.x, stateShape.y, stateShape.z, actorLearningRate, criticLearningRate);
    } else {
        network = await fromNetworks(`file://${networkImportFolder}${sep}${ACTOR_NETWORK_NAME}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`,
            `file://${networkImportFolder}${sep}${CRITIC_NETWORK_NAME}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`,
            actorLearningRate, criticLearningRate);
    }
    network.printSummary();

    // Train network
    const saveFrequency = args[Argument.NETWORK_SAVE_FREQUENCY];
    const networkExportFolder = args[Argument.NETWORK_FOLDER];
    const epochs = args[Argument.EPOCHS];
    const agent = new DdpgAgent(epochs, args[Hyperparameter.TAU], args[Hyperparameter.GAMMA],
        args[Hyperparameter.BUFFER_CAPACITY], args[Hyperparameter.TRAIN_BATCH_SIZE], actorLearningRate, criticLearningRate);
    const [ id, statsPerEpoch ] = await agent.train(network, env, async (epoch, metadata, network) => {
        if (epoch % saveFrequency === 0 || epoch === epochs - 1) {
            try {
                await network.saveTo(name => `${networkExportFolder}${sep}${name}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`, metadata, "file");
                LOGGER.info(`[Epoch ${epoch}] Networks were saved in ${networkExportFolder}`);
            } catch (e) {
                LOGGER.error(`Unable to save networks. Cause: ${e.stack}`);
            }
        }
    });
    LOGGER.info("Training id is: " + id);

    // Export statistics
    const statsFolder = args[Argument.STATS_FOLDER];
    if (statsFolder !== undefined && statsFolder !== null) {
        const statsFile = join(statsFolder, id + ".csv");

        await GamesStats.writeTo(statsPerEpoch, statsFile);
        LOGGER.info(`Training statistics saved in ${statsFile}`);
    }
}

export { Argument, train };

