/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { SingleMapEnvironment } from "../../src/common/game/environment/environments.js";
import { createPolicy, RewardPolicy } from "../../src/common/game/environment/reward.js";
import { NormalStateGenerator } from "../../src/common/game/environment/state/states.js";
import { EntitiesRepresentation } from "../../src/common/game/environment/state/tensor.js";
import LOGGER from "../../src/common/logger.js";
import Survaillant from "../../src/survaillant/src/index.js";

// Getting the loaded maps info
let maps = Survaillant.getMaps();

const stats = {};
maps.forEach(map => {
    // Create environment
    const env = new SingleMapEnvironment(map, createPolicy(RewardPolicy.BANDIT), new NormalStateGenerator(map.board.dimX, map.board.dimY, EntitiesRepresentation.SUMMARY));

    // Play games
    for (let i = 0; i < 1000; i++) {
        env.reset();

        LOGGER.debug(`Game ${i} on ${map.name}`);
        while (true) {
            const { done, _ } = env.step(Math.floor(Math.random() * Survaillant.PlayerMoves.length));
            if (done) {
                break;
            }
        }
    }

    // Gather statistics
    stats[map.name] = env.stats.summary();
})

LOGGER.info(`\n${JSON.stringify(stats, null, 4)}`);
