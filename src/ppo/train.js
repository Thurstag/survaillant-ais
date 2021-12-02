/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs";
import { join, sep } from "path";
import { ListMapEnvironment, SingleMapEnvironment } from "../common/game/environment/environments.js";
import { createPolicy } from "../common/game/environment/reward.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "../common/game/environment/state/states.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";
import LOGGER from "../common/logger.js";
import { SurvaillantTrainingNetwork } from "../common/network.js";
import Map from "../survaillant/src/models/games/Map.js";
import { PpoAgent } from "./agent.js";
import { PpoHyperparameter as Hyperparameter } from "./hyperparameters.js";
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
    STATE_MODE: "state_mode",
    FLASHLIGHT_RADIUS: "flashlight_radius" // TODO: Add dim parameters
};

/**
 * Launch PPO training based on the given arguments (arguments are the script's arguments)
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

            case Generator.NORMAL:
                return new NormalStateGenerator(maps.reduce((a, m) => Math.max(a, m.board.dimX), 0), maps.reduce((a, m) => Math.max(a, m.board.dimY), 0), representation);

            default:
                throw new Error("Unknown state mode: " + mode);
        }
    })();

    // Create environment
    const env = maps.length === 1 ? new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator) : new ListMapEnvironment(maps, rewardPolicy, stateGenerator);
    const stateShape = env.stateShape;

    // Create network
    const networkImportFolder = args[Argument.BASE_NETWORK_FOLDER];
    let network;
    if (networkImportFolder === undefined || networkImportFolder === null) {
        network = random(stateShape.x, stateShape.y, stateShape.z, args[Hyperparameter.HIDDEN_LAYER_UNITS], args[Hyperparameter.POLICY_LEARNING_RATE], args[Hyperparameter.VALUE_LEARNING_RATE]);
    } else {
        network = await fromNetworks(`file://${networkImportFolder}${sep}${POLICY_NETWORK_NAME}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`,
            `file://${networkImportFolder}${sep}${VALUE_NETWORK_NAME}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}${sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`,
            args[Hyperparameter.POLICY_LEARNING_RATE], args[Hyperparameter.VALUE_LEARNING_RATE]);
    }
    network.printSummary();

    // Train network
    const networkExportFolder = args[Argument.NETWORK_FOLDER];
    const agent = new PpoAgent(args[Argument.EPOCHS], args[Hyperparameter.STEPS_PER_EPOCH], args[Hyperparameter.TRAIN_POLICY_ITERATIONS], args[Hyperparameter.TRAIN_VALUE_ITERATIONS],
        args[Hyperparameter.TARGET_KL], args[Hyperparameter.CLIP_RATIO], args[Hyperparameter.GAMMA], args[Hyperparameter.LAM]);
    const id = await agent.train(network, env, async (epoch, metadata, network) => {
        try {
            await network.saveTo(name => `${networkExportFolder}${sep}${name}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`, metadata, "file");
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

export { Argument, train };
