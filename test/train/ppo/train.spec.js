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
import { RewardPolicy } from "../../../src/common/game/environment/reward.js";
import { Generator } from "../../../src/common/game/environment/state/states.js";
import { Representation } from "../../../src/common/game/environment/state/tensor.js";
import { TrainingInformationKey } from "../../../src/common/game/training.js";
import { SurvaillantTrainingNetwork } from "../../../src/common/network.js";
import { BACKEND, load } from "../../../src/common/tensorflow/node/backend-loader.js";
import { PpoAgent } from "../../../src/ppo/agent.js";
import { PpoHyperparameter } from "../../../src/ppo/hyperparameters.js";
import { POLICY_NETWORK_NAME, VALUE_NETWORK_NAME } from "../../../src/ppo/networks.js";
import { Argument, train } from "../../../src/ppo/train.js";
import Map from "../../../src/survaillant/src/models/games/Map.js";
import { assertNetworkFiles, MAP_PATHS, TRAINING_TIMEOUT } from "../common.js";
import { EPOCHS, STEPS_PER_EPOCH, TESTS_NAME, TMP_DIRECTORY_NAME } from "./common.js";

const __filepath = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);
const TMP_DIRECTORY = path.join(__dirname, TMP_DIRECTORY_NAME, path.parse(__filepath).name);

describe(TESTS_NAME, function () {
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
        await fs.mkdir(TMP_DIRECTORY, { recursive: true });
    });

    for (const items of [ true, false ]) {
        it(`Train an existing PPO network (items: ${items})`, async function () {
            this.timeout(TRAINING_TIMEOUT);

            const map = maps[0];
            const stateParams = {};
            stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ map.board.dimX, map.board.dimY ];

            const args = {};
            args[Argument.MAPS] = [ MAP_PATHS[0] ];
            args[Argument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
            args[Argument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
            args[Argument.ITEMS] = items;
            args[Argument.EPOCHS] = EPOCHS;
            args[Argument.STATE_MODE] = Generator.NORMAL.toLowerCase();
            args[Argument.NETWORK_FOLDER] = TMP_DIRECTORY;
            args[Argument.STATS_FOLDER] = TMP_DIRECTORY;
            args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
            args[Argument.BASE_NETWORK_FOLDER] = path.join(__dirname, "assets", items ? "ppo_items" : "ppo");
            args[Argument.NORMAL_MAP_WIDTH] = map.board.dimX;
            args[Argument.NORMAL_MAP_HEIGHT] = map.board.dimY;

            // Train network
            await train(args);

            // Assert exported files
            for (const network of [ POLICY_NETWORK_NAME, VALUE_NETWORK_NAME ]) {
                await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                    PpoAgent.ID, args[Argument.EPOCHS], args[Argument.POLICY], args[Argument.STATE_MODE], stateParams, args[Argument.REPRESENTATION], args[Argument.ITEMS], [ map ]);
            }
        });

        it(`Train PPO on multiple maps (items: ${items})`, async function () {
            this.timeout(TRAINING_TIMEOUT);

            const stateParams = {};
            stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = maps.reduce((a, b) => {
                a[0] = Math.max(b.board.dimX + 1, a[0]);
                a[1] = Math.max(b.board.dimY + 1, a[1]);

                return a;
            }, [ 0, 0 ]);

            const args = {};
            args[Argument.MAPS] = MAP_PATHS;
            args[Argument.POLICY] = RewardPolicy.SCORE_BASED.toLowerCase();
            args[Argument.REPRESENTATION] = Representation.EXHAUSTIVE.toLowerCase();
            args[Argument.ITEMS] = items;
            args[Argument.EPOCHS] = EPOCHS;
            args[Argument.STATE_MODE] = Generator.NORMAL.toLowerCase();
            args[Argument.NETWORK_FOLDER] = TMP_DIRECTORY;
            args[Argument.STATS_FOLDER] = TMP_DIRECTORY;
            args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
            args[Argument.NORMAL_MAP_WIDTH] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][0];
            args[Argument.NORMAL_MAP_HEIGHT] = stateParams[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS][1];

            // Train network
            await train(args);

            // Assert exported files
            for (const network of [ POLICY_NETWORK_NAME, VALUE_NETWORK_NAME ]) {
                await assertNetworkFiles(path.join(TMP_DIRECTORY, `${network}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`),
                    PpoAgent.ID, args[Argument.EPOCHS], args[Argument.POLICY], args[Argument.STATE_MODE], stateParams, args[Argument.REPRESENTATION], args[Argument.ITEMS], MAP_PATHS);
            }
        });
    }
});
