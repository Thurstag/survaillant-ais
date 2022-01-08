/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs/promises";
import path from "path";
import TimeUnit from "timeunit";
import url from "url";
import { ListMapEnvironment, SingleMapEnvironment } from "../../src/common/game/environment/environments.js";
import loadFrom from "../../src/common/game/environment/importer.js";
import { RewardPolicy } from "../../src/common/game/environment/reward.js";
import { Generator } from "../../src/common/game/environment/state/states.js";
import { Representation } from "../../src/common/game/environment/state/tensor.js";
import { TrainingInformationKey } from "../../src/common/game/training.js";
import { SurvaillantTrainingNetwork } from "../../src/common/network.js";
import chai from "../utils/chai.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const MAP_PATHS = [ "privateRoom", "theArea" ].map(name => path.join(path.resolve(__dirname, path.join("..", "..", "src", "survaillant", "assets", "dungeons")), name, "info.json"));
const REPRESENTATIONS = Object.values(Representation).map(r => r.toLowerCase());
const REWARD_POLICIES = Object.values(RewardPolicy).map(p => p.toLowerCase());
const STATE_GENERATORS = Object.values(Generator).map(g => g.toLowerCase());
const TRAINING_TIMEOUT = TimeUnit.minutes.toMillis(5);
const FLASHLIGHT_RADIUS = 3;

async function assertNetworkFiles(folder, agent, epochs, policy, state, stateParams, representation, items, maps) {
    // Assert exported files
    chai.expect(folder).to.be.a.directory().with
        .files([ SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME, SurvaillantTrainingNetwork.MODEL_FILENAME, "weights.bin" ]);

    // Assert training information
    const trainingInfo = JSON.parse(await fs.readFile(path.join(folder, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME)));
    chai.expect(trainingInfo[TrainingInformationKey.AGENT]).to.equal(agent);
    chai.expect(trainingInfo[TrainingInformationKey.EPOCHS]).to.equal(epochs);
    chai.expect(trainingInfo[TrainingInformationKey.ID]).to.be.a("string");
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.POLICY])
        .to.equal(policy);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.TYPE])
        .to.equal(maps.length === 1 ? SingleMapEnvironment.ID : ListMapEnvironment.ID);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.MAPS])
        .to.have.lengthOf(maps.length);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE][TrainingInformationKey.ENV_KEYS.STATE_KEYS.TYPE])
        .to.equal(state);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE][TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS]).to.deep.equal(stateParams);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE][TrainingInformationKey.ENV_KEYS.STATE_KEYS.REPRESENTATION])
        .to.equal(representation);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.ITEMS]).to.equal(items);
}

async function assertTrainingExport(dir, networks, map, isFlashlight, epochs, rewardPolicy, state, representation, itemsEnabled, agent) {
    for (const networkName of networks) {
        let networkPath = path.join(dir, `${networkName}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`);

        const params = {};
        if (isFlashlight) {
            params[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.FLASHLIGHT.RADIUS] = FLASHLIGHT_RADIUS;
        } else {
            params[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];
        }

        await assertNetworkFiles(networkPath, agent, epochs, rewardPolicy, state, params, representation, itemsEnabled, [ MAP_PATHS[0] ]);

        const { policy, network, stateGenerator, trainingInfo, items } = await loadFrom(
            `file://${networkPath}${path.sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`, path.join(networkPath, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME), fs.readFile);
        chai.expect(policy.name).to.be.equal(rewardPolicy);
        chai.expect(network).to.exist;
        chai.expect(stateGenerator.info()).to.deep.equal(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE]);
        chai.expect(items).to.equal(itemsEnabled);
    }
}

export {
    MAP_PATHS, REPRESENTATIONS, REWARD_POLICIES, STATE_GENERATORS, TRAINING_TIMEOUT, FLASHLIGHT_RADIUS,
    assertNetworkFiles, assertTrainingExport
};
