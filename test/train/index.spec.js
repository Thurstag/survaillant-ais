/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs/promises";
import { before, beforeEach, describe, it } from "mocha";
import path from "path";
import TimeUnit from "timeunit";
import url from "url";
import { SingleMapEnvironment } from "../../src/common/game/environment/environments.js";
import { RewardPolicy } from "../../src/common/game/environment/reward.js";
import { Generator } from "../../src/common/game/environment/state/states.js";
import { EntitiesRepresentation } from "../../src/common/game/environment/state/tensor.js";
import { TrainingInformationKey } from "../../src/common/game/training.js";
import SurvaillantNetwork from "../../src/common/network.js";
import { BACKEND, load } from "../../src/common/tensorflow/node/backend-loader.js";
import { PpoAgent } from "../../src/ppo/agent.js";
import { PpoHyperparameter } from "../../src/ppo/hyperparameters.js";
import { POLICY_NETWORK_NAME as PPO_POLICY_NETWORK_NAME, VALUE_NETWORK_NAME as PPO_VALUE_NETWORK_NAME } from "../../src/ppo/networks.js";
import { Argument as PpoArgument, train as trainPpo } from "../../src/ppo/train.js";
import chai from "../utils/chai.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const TMP_DIRECTORY = path.join(__dirname, "tmp");

const MAP_FILE_PATH = path.join(path.resolve(__dirname, path.join("..", "..", "src", "survaillant", "assets", "dungeons")), "privateRoom", "info.json");
const REPRESENTATIONS = Object.keys(EntitiesRepresentation).map(r => r.toLowerCase());
const REWARD_POLICIES = Object.values(RewardPolicy).map(p => p.toLowerCase());
const STATE_GENERATORS = Object.values(Generator).map(g => g.toLowerCase());
const TRAINING_TIMEOUT = TimeUnit.minutes.toMillis(5);
const STEPS_PER_EPOCH = 500;
const EPOCHS = 2;

async function assertNetworkFiles(folder, agent, epochs, policy, state, representation) {
    // Assert exported files
    chai.expect(folder).to.be.a.directory().with
        .files([ SurvaillantNetwork.TRAINING_INFO_FILENAME, SurvaillantNetwork.MODEL_FILENAME, "weights.bin" ]);

    // Assert training information
    const trainingInfo = JSON.parse(await fs.readFile(path.join(folder, SurvaillantNetwork.TRAINING_INFO_FILENAME)));
    chai.expect(trainingInfo[TrainingInformationKey.AGENT]).to.equal(agent);
    chai.expect(trainingInfo[TrainingInformationKey.EPOCHS]).to.equal(epochs);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.POLICY])
        .to.equal(policy);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.TYPE])
        .to.equal(SingleMapEnvironment.ID);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.MAPS])
        .to.have.lengthOf(1);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE][TrainingInformationKey.ENV_KEYS.STATE_KEYS.TYPE])
        .to.equal(state);
    chai.expect(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE][TrainingInformationKey.ENV_KEYS.STATE_KEYS.REPRESENTATION])
        .to.equal(representation);
}

describe("Training integration tests", () => {
    before(async function () {
        this.timeout(TimeUnit.seconds.toMillis(30));

        // Load backend
        await load(BACKEND.CPU);
    });

    beforeEach(async () => {
        // Clear tmp dir
        await fs.rm(TMP_DIRECTORY, { recursive: true, force: true });

        // Create tmp dir
        await fs.mkdir(TMP_DIRECTORY);
    });

    for (const policy of REWARD_POLICIES) {
        for (const representation of REPRESENTATIONS) {
            for (const state of STATE_GENERATORS) {
                it(`Train PPO network (policy: ${policy}, representation: ${representation}, state: ${state})`, async function () {
                    this.timeout(TRAINING_TIMEOUT);

                    const args = {};
                    args[PpoArgument.MAPS] = [ MAP_FILE_PATH ];
                    args[PpoArgument.POLICY] = policy;
                    args[PpoArgument.REPRESENTATION] = representation;
                    args[PpoArgument.EPOCHS] = EPOCHS;
                    args[PpoArgument.STATE_MODE] = state;
                    args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
                    args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;

                    // Train network
                    await trainPpo(args);

                    // Assert exported files
                    for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
                        await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantNetwork.SAVED_MODEL_EXTENSION}`),
                            PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION]);
                    }
                });
            }
        }
    }

    it("Train an existing PPO network", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const args = {};
        args[PpoArgument.MAPS] = [ MAP_FILE_PATH ];
        args[PpoArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[PpoArgument.REPRESENTATION] = "exhaustive";
        args[PpoArgument.EPOCHS] = EPOCHS;
        args[PpoArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
        args[PpoArgument.BASE_NETWORK_FOLDER] = path.join(__dirname, "assets", "ppo");

        // Train network
        await trainPpo(args);

        // Assert exported files
        for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantNetwork.SAVED_MODEL_EXTENSION}`),
                PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION]);
        }
    });
});
