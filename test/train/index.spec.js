/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs/promises";
import { before, beforeEach, describe, it } from "mocha";
import path from "path";
import TimeUnit from "timeunit";
import url from "url";
import { AUTO_ARGUMENT_VALUE } from "../../src/common/argparse.js";
import { ListMapEnvironment, SingleMapEnvironment } from "../../src/common/game/environment/environments.js";
import loadFrom from "../../src/common/game/environment/importer.js";
import { RewardPolicy } from "../../src/common/game/environment/reward.js";
import { Generator } from "../../src/common/game/environment/state/states.js";
import { Representation } from "../../src/common/game/environment/state/tensor.js";
import { TrainingInformationKey } from "../../src/common/game/training.js";
import { SurvaillantTrainingNetwork } from "../../src/common/network.js";
import { BACKEND, load } from "../../src/common/tensorflow/node/backend-loader.js";
import { DdpgAgent } from "../../src/ddpg/agent.js";
import { ACTOR_NETWORK_NAME as DDPG_ACTOR_NETWORK_NAME, CRITIC_NETWORK_NAME as DDPG_CRITIC_NETWORK_NAME } from "../../src/ddpg/networks.js";
import { Argument as DdpgArgument, train as trainDdpg } from "../../src/ddpg/train.js";
import { SurvaillantDQNAgent } from "../../src/dqn/agent.js";
import { train as trainDqn } from "../../src/dqn/train.js";
import { PpoAgent } from "../../src/ppo/agent.js";
import { PpoHyperparameter } from "../../src/ppo/hyperparameters.js";
import { POLICY_NETWORK_NAME as PPO_POLICY_NETWORK_NAME, VALUE_NETWORK_NAME as PPO_VALUE_NETWORK_NAME } from "../../src/ppo/networks.js";
import { Argument as PpoArgument, train as trainPpo } from "../../src/ppo/train.js";
import Map from "../../src/survaillant/src/models/games/Map.js";
import chai from "../utils/chai.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const TMP_DIRECTORY = path.join(__dirname, "tmp");

const MAP_PATHS = [ "privateRoom", "theArea" ].map(name => path.join(path.resolve(__dirname, path.join("..", "..", "src", "survaillant", "assets", "dungeons")), name, "info.json"));
const REPRESENTATIONS = Object.values(Representation).map(r => r.toLowerCase());
const REWARD_POLICIES = Object.values(RewardPolicy).map(p => p.toLowerCase());
const STATE_GENERATORS = Object.values(Generator).map(g => g.toLowerCase());
const TRAINING_TIMEOUT = TimeUnit.minutes.toMillis(5);
const STEPS_PER_EPOCH = 500;
const FLASHLIGHT_RADIUS = 3;
const PPO_EPOCHS = 2, DDPG_EPOCHS = 42, DQN_EPOCHES = 20;
const DDPG_SAVE_FREQUENCY = 10;

async function assertNetworkFiles(folder, agent, epochs, policy, state, stateParams, representation, maps) {
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
}

async function assertTrainingExport(networks, map, isFlashlight, epochs, rewardPolicy, state, representation, agent) {

    for (const networkName of networks) {
        let networkPath = path.join(TMP_DIRECTORY, `${networkName}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`);

        const params = {};
        if (isFlashlight) {
            params[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.FLASHLIGHT.RADIUS] = FLASHLIGHT_RADIUS;
        } else {
            params[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];
        }

        await assertNetworkFiles(networkPath, agent, epochs, rewardPolicy, state, params, representation, [ MAP_PATHS[0] ]);

        const { policy, network, stateGenerator, trainingInfo } = await loadFrom(`file://${networkPath}${path.sep}${SurvaillantTrainingNetwork.MODEL_FILENAME}`, path.join(networkPath, SurvaillantTrainingNetwork.TRAINING_INFO_FILENAME), fs.readFile);
        
        chai.expect(policy.name).to.be.equal(rewardPolicy);
        chai.expect(network).to.exist;
        chai.expect(stateGenerator.info()).to.deep.equal(trainingInfo[TrainingInformationKey.ENV][TrainingInformationKey.ENV_KEYS.STATE]);
    }
}

describe("Training integration tests", () => {

    let maps;
    before(async function () {
        this.timeout(TimeUnit.seconds.toMillis(30));

        // Load backend
        await load(BACKEND.CPU);

        // Load maps
        maps = await Promise.all(MAP_PATHS.map(async m => new Map(JSON.parse(await fs.readFile(m, "utf-8")))));
    });

    beforeEach(async () => {
        // Clear tmp dir
        await fs.rm(TMP_DIRECTORY, { recursive: true, force: true });

        // Create tmp dir
        await fs.mkdir(TMP_DIRECTORY);
    });

    for (const rewardPolicy of REWARD_POLICIES) {
        for (const state of STATE_GENERATORS) {
            for (const representation of REPRESENTATIONS) {
                it(`Train PPO network (policy: ${rewardPolicy}, representation: ${representation}, state: ${state})`, async function () {
                    this.timeout(TRAINING_TIMEOUT);

                    const isFlashlight = state.toUpperCase() === Generator.FLASHLIGHT;
                    const map = maps[0];

                    const args = {};
                    args[PpoArgument.MAPS] = [ MAP_PATHS[0] ];
                    args[PpoArgument.POLICY] = rewardPolicy;
                    args[PpoArgument.REPRESENTATION] = representation;
                    args[PpoArgument.EPOCHS] = PPO_EPOCHS;
                    args[PpoArgument.STATE_MODE] = state;
                    args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
                    args[PpoArgument.STATS_FOLDER] = TMP_DIRECTORY;
                    args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
                    if (isFlashlight) {
                        args[PpoArgument.FLASHLIGHT_RADIUS] = FLASHLIGHT_RADIUS;
                    } else {
                        args[PpoArgument.NORMAL_MAP_WIDTH] = AUTO_ARGUMENT_VALUE;
                        args[PpoArgument.NORMAL_MAP_HEIGHT] = AUTO_ARGUMENT_VALUE;
                    }

                    // Train network
                    await trainPpo(args);

                    // Assert exported files
                    await assertTrainingExport([ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ], map, isFlashlight, args[PpoArgument.EPOCHS],
                        args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], args[PpoArgument.REPRESENTATION], PpoAgent.ID);
                });

                it(`Train DDPG network (policy: ${rewardPolicy}, representation: ${representation}, state: ${state})`, async function () {
                    this.timeout(TRAINING_TIMEOUT);

                    const isFlashlight = state.toUpperCase() === Generator.FLASHLIGHT;
                    const map = maps[0];

                    const args = {};
                    args[DdpgArgument.MAPS] = [ MAP_PATHS[0] ];
                    args[DdpgArgument.POLICY] = rewardPolicy;
                    args[DdpgArgument.REPRESENTATION] = representation;
                    args[DdpgArgument.EPOCHS] = DDPG_EPOCHS;
                    args[DdpgArgument.STATE_MODE] = state;
                    args[DdpgArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
                    args[DdpgArgument.STATS_FOLDER] = TMP_DIRECTORY;
                    args[DdpgArgument.NETWORK_SAVE_FREQUENCY] = DDPG_SAVE_FREQUENCY;
                    if (isFlashlight) {
                        args[DdpgArgument.FLASHLIGHT_RADIUS] = FLASHLIGHT_RADIUS;
                    } else {
                        args[DdpgArgument.NORMAL_MAP_WIDTH] = AUTO_ARGUMENT_VALUE;
                        args[DdpgArgument.NORMAL_MAP_HEIGHT] = AUTO_ARGUMENT_VALUE;
                    }

                    // Train network
                    await trainDdpg(args);

                    // Assert exported files
                    await assertTrainingExport([ DDPG_ACTOR_NETWORK_NAME, DDPG_CRITIC_NETWORK_NAME ], map, isFlashlight, args[DdpgArgument.EPOCHS],
                        args[DdpgArgument.POLICY], args[DdpgArgument.STATE_MODE], args[DdpgArgument.REPRESENTATION], DdpgAgent.ID);
                });
                it(`Train DQNs network (policy: ${rewardPolicy}, representation: ${representation}, state: ${state})`, async function () {
                   
                    this.timeout(TRAINING_TIMEOUT);
    
                    const isFlashlight = state.toUpperCase() === Generator.FLASHLIGHT;
                    const map = maps[0];
    
                    const args = {};
                    args["maps"] = [ MAP_PATHS[0] ];
                    args["policy"] = rewardPolicy;
                    args["representation"] = representation;
                    args["epoch"] = DQN_EPOCHES;
                    args["state"] = state;
                    args["savePath"] = TMP_DIRECTORY;
                    args["stats"] = TMP_DIRECTORY;
                    args["updateTargetNetwork"] = 20;
                    args["epsilonRandomFrames"] = 0;
                    args["epsilonGreedyFrames"] = 0;
                    args["maxMemoryLength"] = 50;
                    args["updateAfterNbActions"] = 4;
                    args["batchSize"] = 16;
                    args["gamma"] = 0.99;
                    args["maxStepsPerEpisode"] = 10000;
                    args["epsilonMin"] = 0.1;
                    args["epsilonMax"] = 1;
                    args["epsilon"] = 0.2;
                    if (isFlashlight) {
                        args["radius"] = FLASHLIGHT_RADIUS;
                    } else {
                        args["width"] = AUTO_ARGUMENT_VALUE;
                        args["height"] = AUTO_ARGUMENT_VALUE;
                    }
    
                    // Train network
                    await trainDqn(args);
    
                    // Assert exported files
                    await assertTrainingExport([ SurvaillantDQNAgent.ID ], map, isFlashlight, args.epoch,
                        args.policy, args.state, args.representation, SurvaillantDQNAgent.ID);
                });
            }
        }
    }

    it("Train an existing PPO network", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const map = maps[0];
        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];

        const args = {};
        args[PpoArgument.MAPS] = [ MAP_PATHS[0] ];
        args[PpoArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[PpoArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[PpoArgument.EPOCHS] = PPO_EPOCHS;
        args[PpoArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[PpoArgument.STATS_FOLDER] = TMP_DIRECTORY;
        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
        args[PpoArgument.BASE_NETWORK_FOLDER] = path.join(__dirname, "assets", "ppo");
        args[PpoArgument.NORMAL_MAP_WIDTH] = map.board.dimX;
        args[PpoArgument.NORMAL_MAP_HEIGHT] = map.board.dimY;

        // Train network
        await trainPpo(args);

        // Assert exported files
        for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], stateParams, args[PpoArgument.REPRESENTATION], [ map ]);
        }
    });

    it("Train an existing DDPG network", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const map = maps[0];
        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];

        const args = {};
        args[DdpgArgument.MAPS] = [ MAP_PATHS[0] ];
        args[DdpgArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[DdpgArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[DdpgArgument.EPOCHS] = DDPG_EPOCHS;
        args[DdpgArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[DdpgArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[DdpgArgument.STATS_FOLDER] = TMP_DIRECTORY;
        args[DdpgArgument.BASE_NETWORK_FOLDER] = path.join(__dirname, "assets", "ddpg");
        args[DdpgArgument.NORMAL_MAP_WIDTH] = map.board.dimX;
        args[DdpgArgument.NORMAL_MAP_HEIGHT] = map.board.dimY;
        args[DdpgArgument.NETWORK_SAVE_FREQUENCY] = DDPG_SAVE_FREQUENCY;

        // Train network
        await trainDdpg(args);

        // Assert exported files
        for (const network of [ DDPG_ACTOR_NETWORK_NAME, DDPG_CRITIC_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                DdpgAgent.ID, args[DdpgArgument.EPOCHS], args[DdpgArgument.POLICY], args[DdpgArgument.STATE_MODE], stateParams, args[DdpgArgument.REPRESENTATION], [ map ]);
        }
    });

    it("Train an existing DQN network", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const map = maps[0];
        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];

        const args = {};
        args["maps"] = [ MAP_PATHS[0] ];
        args["policy"] = RewardPolicy.SCORE_BASED.toLowerCase();
        args["representation"] = Representation.EXHAUSTIVE.toLowerCase();
        args["epoch"] = DQN_EPOCHES;
        args["state"] = Generator.NORMAL.toLowerCase();
        args["width"] = 10;
        args["height"] = 8;
        args["savePath"] = TMP_DIRECTORY;
        args["stats"] = TMP_DIRECTORY;
        args["radius"] = FLASHLIGHT_RADIUS;
        args["baseNetworkFolder"] = path.join(__dirname, "assets", "dqn");
        args["updateTargetNetwork"] = 1;

        // Train network
        await trainDqn(args);

        const network = SurvaillantDQNAgent.ID;

        // Assert exported files
        await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
            SurvaillantDQNAgent.ID, args.epoch, args.policy, args.state, stateParams, args.representation, [ map ]);
    });

    it("Train PPO on multiple maps", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = maps.reduce((a, b) => {
            a[0] = Math.max(b.board.dimX + 1, a[0]);
            a[1] = Math.max(b.board.dimY + 1, a[1]);

            return a;
        }, [ 0, 0 ]);

        const args = {};
        args[PpoArgument.MAPS] = MAP_PATHS;
        args[PpoArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[PpoArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[PpoArgument.EPOCHS] = PPO_EPOCHS;
        args[PpoArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[PpoArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[PpoArgument.STATS_FOLDER] = TMP_DIRECTORY;
        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
        args[PpoArgument.NORMAL_MAP_WIDTH] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][0];
        args[PpoArgument.NORMAL_MAP_HEIGHT] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][1];

        // Train network
        await trainPpo(args);

        // Assert exported files
        for (const network of [ PPO_POLICY_NETWORK_NAME, PPO_VALUE_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                PpoAgent.ID, args[PpoArgument.EPOCHS], args[PpoArgument.POLICY], args[PpoArgument.STATE_MODE], stateParams, args[PpoArgument.REPRESENTATION], MAP_PATHS);
        }
    });

    it("Train DDPG on multiple maps", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = maps.reduce((a, b) => {
            a[0] = Math.max(b.board.dimX + 1, a[0]);
            a[1] = Math.max(b.board.dimY + 1, a[1]);

            return a;
        }, [ 0, 0 ]);

        const args = {};
        args[DdpgArgument.MAPS] = MAP_PATHS;
        args[DdpgArgument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
        args[DdpgArgument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
        args[DdpgArgument.EPOCHS] = DDPG_EPOCHS;
        args[DdpgArgument.STATE_MODE] = Generator.NORMAL.toLowerCase();
        args[DdpgArgument.NETWORK_FOLDER] = TMP_DIRECTORY;
        args[DdpgArgument.STATS_FOLDER] = TMP_DIRECTORY;
        args[DdpgArgument.NORMAL_MAP_WIDTH] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][0];
        args[DdpgArgument.NORMAL_MAP_HEIGHT] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][1];
        args[DdpgArgument.NETWORK_SAVE_FREQUENCY] = DDPG_SAVE_FREQUENCY;

        // Train network
        await trainDdpg(args);

        // Assert exported files
        for (const network of [ DDPG_ACTOR_NETWORK_NAME, DDPG_CRITIC_NETWORK_NAME ]) {
            await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                DdpgAgent.ID, args[DdpgArgument.EPOCHS], args[DdpgArgument.POLICY], args[DdpgArgument.STATE_MODE], stateParams, args[DdpgArgument.REPRESENTATION], MAP_PATHS);
        }
    });

    it("Train DQN on multiple maps", async function () {
        this.timeout(TRAINING_TIMEOUT);

        const stateParams = {};
        stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = maps.reduce((a, b) => {
            a[0] = Math.max(b.board.dimX + 1, a[0]);
            a[1] = Math.max(b.board.dimY + 1, a[1]);

            return a;
        }, [ 0, 0 ]);

        const args = {};
        args["maps"] = MAP_PATHS;
        args["policy"] = RewardPolicy.SCORE_BASED.toLowerCase();
        args["representation"] = Representation.EXHAUSTIVE.toLowerCase();
        args["epoch"] = DQN_EPOCHES;
        args["state"] = Generator.NORMAL.toLowerCase();
        args["savePath"] = TMP_DIRECTORY;
        args["stats"] = TMP_DIRECTORY;
        args["radius"] = FLASHLIGHT_RADIUS;
        args["width"] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][0];
        args["height"] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][1];
        args["updateTargetNetwork"] = 1;

        // Train network
        await trainDqn(args);

        const network = SurvaillantDQNAgent.ID;

        // Assert exported files
        await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
            SurvaillantDQNAgent.ID, args.epoch, args.policy, args.state, stateParams, args.representation, MAP_PATHS);
    });
});
