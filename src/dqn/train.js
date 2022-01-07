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
import { SurvaillantTrainingNetwork } from "../common/network.js";
import { EntitiesRepresentation } from "../common/game/environment/state/tensor.js";
import { FlashlightStateGenerator, Generator, NormalStateGenerator } from "../common/game/environment/state/states.js";
import { GamesStats } from "../common/game/stats.js";

import { SurvaillantDQNAgent } from "./agent.js";
import Map from "../survaillant/src/models/games/Map.js";

import LOGGER from "../common/logger.js";

/**
 * Launch DQN training from args
 * @param {*} args 
 */
async function train(args) {
    // Select maps
    const maps = args.maps.map(path => new Map(JSON.parse(fs.readFileSync(path, "utf8"))));

    const representation = EntitiesRepresentation[args.representation.toUpperCase()];

    // Generate the state from args
    const stateGenerator = (() => {
        const mode = args.state.toUpperCase();

        switch (mode) {
            case Generator.FLASHLIGHT:
                if(args.radius == 0) {
                    throw new Error("Radius should be define != 0 when flashlight state is used");
                }
                return new FlashlightStateGenerator(args.radius, representation);

            case Generator.NORMAL: {
                const width = args.width;
                const height = args.height;

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

    // Define the reward policy
    let rewardPolicy = createPolicy(args.policy.toUpperCase());

    // Create env
    const env = maps.length === 1 ? new SingleMapEnvironment(maps[0], rewardPolicy, stateGenerator) : new ListMapEnvironment(maps, rewardPolicy, stateGenerator);

    // Create agent
    const agent = new SurvaillantDQNAgent(args, env);

    // Launch train
    const [ id, statsPerEpoch ] = await agent.train(async (epoch, metadata, network) => { 
        try {
            await network.saveTo(name => `${args.savePath}${sep}${name}${SurvaillantTrainingNetwork.SAVED_MODEL_EXTENSION}`, metadata, "file");
            LOGGER.info(`Saved in ${args.savePath} : Max ${epoch}`);
        } catch (e) {
            LOGGER.error(`Unable to save networks. Cause: ${e.stack}`);
        }
    });

    const statsFolder = args.stats;
    if (statsFolder !== undefined && statsFolder !== null) {
        const statsFile = join(statsFolder, id + ".csv");

        await GamesStats.writeTo(statsPerEpoch, statsFile);
        LOGGER.info(`Training statistics saved in ${statsFile}`);
    }
}

export { train };
