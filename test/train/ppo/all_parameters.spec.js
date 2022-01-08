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
import { AUTO_ARGUMENT_VALUE } from "../../../src/common/argparse.js";
import { Generator } from "../../../src/common/game/environment/state/states.js";
import { BACKEND, load } from "../../../src/common/tensorflow/node/backend-loader.js";
import { PpoAgent } from "../../../src/ppo/agent.js";
import { PpoHyperparameter } from "../../../src/ppo/hyperparameters.js";
import { POLICY_NETWORK_NAME, VALUE_NETWORK_NAME } from "../../../src/ppo/networks.js";
import { Argument, train as train } from "../../../src/ppo/train.js";
import Map from "../../../src/survaillant/src/models/games/Map.js";
import { assertTrainingExport, FLASHLIGHT_RADIUS, MAP_PATHS, REPRESENTATIONS, REWARD_POLICIES, STATE_GENERATORS, TRAINING_TIMEOUT } from "../common.js";
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

    for (const rewardPolicy of REWARD_POLICIES) {
        for (const representation of REPRESENTATIONS) {
            for (const state of STATE_GENERATORS) {
                for (const items of [ true, false ]) {
                    it(`Train PPO network (policy: ${rewardPolicy}, representation: ${representation}, state: ${state}, items: ${items})`, async function () {
                        this.timeout(TRAINING_TIMEOUT);

                        const isFlashlight = state.toUpperCase() === Generator.FLASHLIGHT;
                        const map = maps[0];

                        const args = {};
                        args[Argument.MAPS] = [ MAP_PATHS[0] ];
                        args[Argument.POLICY] = rewardPolicy;
                        args[Argument.REPRESENTATION] = representation;
                        args[Argument.ITEMS] = items;
                        args[Argument.EPOCHS] = EPOCHS;
                        args[Argument.STATE_MODE] = state;
                        args[Argument.NETWORK_FOLDER] = TMP_DIRECTORY;
                        args[Argument.STATS_FOLDER] = TMP_DIRECTORY;
                        args[PpoHyperparameter.STEPS_PER_EPOCH] = STEPS_PER_EPOCH;
                        if (isFlashlight) {
                            args[Argument.FLASHLIGHT_RADIUS] = FLASHLIGHT_RADIUS;
                        } else {
                            args[Argument.NORMAL_MAP_WIDTH] = AUTO_ARGUMENT_VALUE;
                            args[Argument.NORMAL_MAP_HEIGHT] = AUTO_ARGUMENT_VALUE;
                        }

                        // Train network
                        await train(args);

                        // Assert exported files
                        await assertTrainingExport(TMP_DIRECTORY, [ POLICY_NETWORK_NAME, VALUE_NETWORK_NAME ], map, isFlashlight, args[Argument.EPOCHS],
                            args[Argument.POLICY], args[Argument.STATE_MODE], args[Argument.REPRESENTATION], args[Argument.ITEMS], PpoAgent.ID);
                    });
                }
            }
        }
    }
});
