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
import { ListMapEnvironment, SingleMapEnvironment } from "../../src/common/game/environment/environments.js";
import loadFrom from "../../src/common/game/environment/importer.js";
import { RewardPolicy } from "../../src/common/game/environment/reward.js";
import { Generator } from "../../src/common/game/environment/state/states.js";
import { Representation } from "../../src/common/game/environment/state/tensor.js";
import { TrainingInformationKey } from "../../src/common/game/training.js";
import { SurvaillantTrainingNetwork } from "../../src/common/network.js";
import { BACKEND, load } from "../../src/common/tensorflow/node/backend-loader.js";
import { PpoAgent } from "../../src/ppo/agent.js";
import { PpoHyperparameter } from "../../src/ppo/hyperparameters.js";
import { POLICY_NETWORK_NAME as PPO_POLICY_NETWORK_NAME, VALUE_NETWORK_NAME as PPO_VALUE_NETWORK_NAME } from "../../src/ppo/networks.js";
import { Argument as PpoArgument, train as trainPpo } from "../../src/ppo/train.js";
import chai from "../utils/chai.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const TMP_DIRECTORY = path.join(__dirname, "tmp");

const MAPS = [ "privateRoom", "theArea" ];
const REPRESENTATIONS = Object.values(Representation).map(r => r.toLowerCase());
const REWARD_POLICIES = Object.values(RewardPolicy).map(p => p.toLowerCase());
const STATE_GENERATORS = Object.values(Generator).map(g => g.toLowerCase());
const TRAINING_TIMEOUT = TimeUnit.minutes.toMillis(5);
const STEPS_PER_EPOCH = 500;
const EPOCHS = 2;

function mapPath(name) {
    return path.join(path.resolve(__dirname, path.join("..", "..", "src", "survaillant", "assets", "dungeons")), name, "info.json");
}

async function assertNetworkFiles(folder, agent, epochs, policy, state, representation, maps) {
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

    for (const rewardPolicy of REWARD_POLICIES) {
        for (const representation of REPRESENTATIONS) {
            for (const state of STATE_GENERATORS) {
                it(`Train PPO network (policy: ${rewardPolicy}, representation: ${representation}, state: ${state})`, async function () {
                    this.timeout(TRAINING_TIMEOUT);

                    const args = {};
                    args[PpoArgument.MAPS] = [ mapPath(MAPS[0]) ];
                    args[PpoArgument.POLICY] = rewardPolicy;
                    args[PpoArgument.REPRESENTATION] = representation;
                    args[PpoArgument.EPOCHS] = EPOCHS;
                    args[PpoArgument.STATE_MODE] = state;
                    args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
                    args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;

                    // Train network
                    await trainPpo(args);

                    // Assert exported files
                    for (const networkName of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
                        let networkPath = path.join(TMP_DIRECTORY, `${networkName}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`);

                        await assertNetworkFiles(networkPath,
                            PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION], [ MAPS[0] ]);

                        const { policy, network, stateGenerator, trainingInfo } = await loadFrom(`file://${networkPath}${path.sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`, path.join(networkPath, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME), fs.readFile);
                        chai.expect(policy.name).to.be.equal(rewardPolicy);
                        chai.expect(network).to.exist;
                        chai.expect(stateGenerator.info()).to.deep.equal(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE]);
                   }
                });
            }
        }
    }

    it("Train an existing PPO network", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const args = {};
        args[PpoArgument.MAPS] = [ mapPath(MAPS[0]) ];
        args[PpoArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[PpoArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[PpoArgument.EPOCHS] = EPOCHS;
        args[PpoArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
        args[PpoArgument.BASE_NETWORK_FOLDER] = path.join(__dirname, "assets", "ppo");

        // Train network
        await trainPpo(args);

        // Assert exported files
        for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION], [ MAPS[0] ]);
        }
    });

    it("Train on multiple maps", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const args = {};
        args[PpoArgument.MAPS] = MAPS.map(m => mapPath(m));
        args[PpoArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[PpoArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[PpoArgument.EPOCHS] = EPOCHS;
        args[PpoArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;

        // Train network
        await trainPpo(args);

        // Assert exported files
        for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION], MAPS);
        }
    });
});