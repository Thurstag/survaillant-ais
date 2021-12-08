/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";

// TODO: Doc
const Entity = {
    NONE: 0,


    WALL: 1,

    PLAYER: 1,

    CHEST: 1,

    MONSTER: 1,

    SPAWNING_CHEST: [ undefined, 1, undefined, undefined, undefined, undefined, undefined ],
    SPAWNING_TRAP: [ undefined, 1, undefined ],
    MONSTER_SPAWN: [ undefined, 1, undefined, undefined ]
};

// TODO: Doc
const DEADLY_SPAWN_LAYER = 4;
const LayerOfEntity = {
    WALL: 0,

    PLAYER: 1,

    CHEST: 2,

    MONSTER: 3,

    SPAWNING_CHEST: Entity.SPAWNING_CHEST.map(e => e ? DEADLY_SPAWN_LAYER : undefined),
    SPAWNING_TRAP: Entity.SPAWNING_TRAP.map(e => e ? DEADLY_SPAWN_LAYER : undefined),
    MONSTER_SPAWN: Entity.MONSTER_SPAWN.map(e => e ? DEADLY_SPAWN_LAYER : undefined)
};

const LAYERS_COUNT = new Set(Object.values(LayerOfEntity).flatMap(x => x).filter(v => v !== undefined && v !== null)).size;

// TODO: Doc
function flashlight(game, radius) {
    const gameState = game.getState();

    // Get player's position
    const playerPosition = gameState.players[0].pos;

    const stateDim = radius * 2 + 1;
    const state = tf.buffer([ stateDim, stateDim, LAYERS_COUNT ]);

    // Define state bounds
    const minX = playerPosition.x - radius;
    const maxX = playerPosition.x + radius + 1; // Exclusive bound
    const minY = playerPosition.y - radius;
    const maxY = playerPosition.y + radius + 1; // Exclusive bound

    const toLocalX = x => x - minX;
    const toLocalY = y => y - minY;

    // Define grounds and walls
    for (let x = minX; x < maxX; x++) {
        for (let y = minY; y < maxY; y++) {
            const localX = toLocalX(x);
            const localY = toLocalY(y);

            if (x < 0 || x >= gameState.map.board.dimX || y < 0 || y >= gameState.map.board.dimY) {
                state.set(Entity.WALL, localX, localY, LayerOfEntity.WALL);
            } else {
                for (let i = 0; i < LAYERS_COUNT; i++) {
                    state.set(Entity.NONE, localX, localY, i);
                }
            }
        }
    }

    const markVisibleEntity = (x, y, entity, layer) => {
        if (layer === undefined || layer === null) {
            return;
        }

        if (entity === undefined || entity === null) {
            throw new Error("Unknown value: " + entity + " at (" + x + ", " + y + ", " + layer + ")");
        }

        if (x >= minX && x < maxX && y >= minY && y < maxY) {
            state.set(entity, toLocalX(x), toLocalY(y), layer);
        }
    };

    // Iterate over entities and update state
    game.forEach(
        chest => markVisibleEntity(chest.pos.x, chest.pos.y,
            !chest.dead ? Entity.CHEST : Entity.SPAWNING_CHEST[chest.timeBeforeSpawn],
            !chest.dead ? LayerOfEntity.CHEST : LayerOfEntity.SPAWNING_CHEST[chest.timeBeforeSpawn]),
        (x, y) => markVisibleEntity(x, y, Entity.MONSTER, LayerOfEntity.MONSTER),
        trap => markVisibleEntity(trap.pos.x, trap.pos.y, Entity.SPAWNING_TRAP[trap.loop], LayerOfEntity.SPAWNING_TRAP[trap.loop]),
        monsterSpawn => markVisibleEntity(monsterSpawn.pos.x, monsterSpawn.pos.y, Entity.MONSTER_SPAWN[monsterSpawn.timeBeforeSpawn], LayerOfEntity.MONSTER_SPAWN[monsterSpawn.timeBeforeSpawn])
    );

    // Define player
    markVisibleEntity(playerPosition.x, playerPosition.y, Entity.PLAYER, LayerOfEntity.PLAYER);

    return state.toTensor();
}

export { flashlight, LAYERS_COUNT };
