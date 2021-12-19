/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { PpoAgent } from "../../../ppo/agent.js";
import { fromNetwork as loadPpoFinalNetwork } from "../../../ppo/networks.js";
import { fromNetwork as loadDQNFinalNetwork } from "../../../dqn/network.js";
import { TrainingInformationKey } from "../training.js";
import { createPolicy } from "./reward.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "./state/states.js";
import { EntitiesRepresentation } from "./state/tensor.js";

/**
 * Load environment parameters from a trained network
 *
 * @param {String} modelFile Path to file defining the network
 * @param {String} trainingInfoFile Path to a file defining training information
 * @param {function(String): *} fileLoader Function to load a file's content given a given path
 * @return {Promise<{stateGenerator: StateGenerator, trainingInfo: Object, network: SurvaillantFinalNetwork, policy: (MapRewardPolicy|ScoreDrivenPolicy)}>}
 * State generator, training information, network, and reward policy
 */
async function loadFrom(modelFile, trainingInfoFile, fileLoader) {
    // Load training info
    const trainingInfo = JSON.parse(await fileLoader(trainingInfoFile));

    // Create network
    const network = await (() => {
        let agent = trainingInfo[TrainingInformationKey.AGENT];

        if (agent === PpoAgent.ID) {
            return loadPpoFinalNetwork(modelFile);
        } else if (agent === "DQN") {
            return loadDQNFinalNetwork(modelFile);
        }

        throw new Error(`Unknown agent: ${agent}`);
    })();

    // Create policy
    const policy = createPolicy(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.POLICY].toUpperCase());

    // Retrieve representation
    let stateInfo = trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE];
    const representation = EntitiesRepresentation[stateInfo[TrainingInformationKey.ENV_KEYS.STATE_KEYS.REPRESENTATION].toUpperCase()];

    // Create state generator
    const stateGenerator = (() => {
        const mode = stateInfo[TrainingInformationKey.ENV_KEYS.STATE_KEYS.TYPE].toUpperCase();
        const parameters = stateInfo[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS];

        switch (mode) {
            case Generator.FLASHLIGHT:
                return new FlashlightStateGenerator(parameters[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.FLASHLIGHT.RADIUS], representation);

            case Generator.NORMAL: {
                const dimensions = parameters[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS];
                return new NormalStateGenerator(dimensions[0], dimensions[1], representation);
            }

            default:
                throw new Error("Unknown state mode: " + mode);
        }
    })();

    return { network, policy, stateGenerator, trainingInfo };
}

export default loadFrom;
