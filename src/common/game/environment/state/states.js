/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import { TrainingInformationKey } from "../../training.js";
import { NONE, WALL } from "./entities.js";
import { NO_LAYER } from "./tensor.js";

/**
 * Class generating a tensor used to represent the state of a game at a time T
 */
class StateGenerator {
    /**
     * Constructor
     *
     * @param {TensorEntitiesRepresentation} tensorInfo Information about data stored in the tensor
     */
    constructor(tensorInfo) {
        this.tensorInfo = tensorInfo;
    }

    /**
     * Generate a tensor representing the given game
     *
     * @param {SurvaillantGame} game Game
     * @return {Tensor} Game's state
     */
    state(game) { // eslint-disable-line no-unused-vars
        throw new Error("state isn't implemented");
    }

    /**
     * Get the shape of tensors generated by this
     *
     * @return {{x: number, y: number, z: number}} Dimensions on all axes
     */
    shape() {
        throw new Error("shape isn't implemented");
    }

    /**
     * Get its identifier
     *
     * @return {string} Id
     */
    id() {
        throw new Error("id isn't implemented");
    }

    /**
     * Get information about the state
     *
     * @return {{type: string, parameters: Object, representation: String}} Information
     */
    info() {
        throw new Error("info isn't implemented");
    }
}

/**
 * Class generating a state representing the whole map
 */
class NormalStateGenerator extends StateGenerator {
    static ID = "normal";

    #stateDimX;
    #stateDimY;

    /**
     * Constructor
     *
     * @param {number} x Maximum dimension of the map in the first dimension
     * @param {number} y Maximum dimension of the map in the second dimension
     * @param {TensorEntitiesRepresentation} tensorInfo Information about data stored in the tensor
     */
    constructor(x, y, tensorInfo) {
        super(tensorInfo);

        this.#stateDimX = x;
        this.#stateDimY = y;
    }

    id() {
        return `${NormalStateGenerator.ID}[${this.#stateDimX}x${this.#stateDimY}, ${this.tensorInfo.name}]`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.TYPE] = NormalStateGenerator.ID;
        const parameters = info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS] = {};
        parameters[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.NORMAL.DIMENSIONS] = [ this.#stateDimX, this.#stateDimY ];
        info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.REPRESENTATION] = this.tensorInfo.name;

        return info;
    }

    shape() {
        return { x: this.#stateDimX, y: this.#stateDimY, z: this.tensorInfo.layers };
    }

    state(game) {
        const gameState = game.getState();

        const state = tf.buffer([ this.#stateDimX, this.#stateDimY, this.tensorInfo.layers ]);

        // Define ground and walls
        for (let x = 0; x < this.#stateDimX; x++) {
            for (let y = 0; y < this.#stateDimY; y++) {
                if (x >= gameState.map.board.dimX || y >= gameState.map.board.dimY || gameState.map.floor[x][y] !== 1) {
                    state.set(this.tensorInfo.value(WALL), x, y, this.tensorInfo.layer(WALL));
                } else {
                    for (let i = 0; i < this.tensorInfo.layers; i++) {
                        state.set(this.tensorInfo.value(NONE), x, y, i);
                    }
                }
            }
        }

        // Iterate over entities and define them in tensor
        game.forEach(entity => {
            // Get value and layer for this entity
            const value = this.tensorInfo.value(entity);
            const layer = this.tensorInfo.layer(entity);

            // Check value and layer
            if (layer === NO_LAYER) {
                return;
            }
            const x = entity.pos.x;
            const y = entity.pos.y;
            if (value === undefined) {
                throw new Error(`Unknown value: ${value} at (${x}, ${y}, ${layer})`);
            }

            // Define entity in tensor
            state.set(value, x, y, layer);
        });

        return state.toTensor();
    }
}

/**
 * Class generating a state representing the surrounding environment of the player with a specific radius.
 * After a specific distance, the player doesn't have information about the map
 */
class FlashlightStateGenerator extends StateGenerator {
    static ID = "flashlight";

    #radius;
    #stateDim;

    /**
     * Constructor
     *
     * @param {number} radius Radius of the flashlight
     * @param {TensorEntitiesRepresentation} tensorInfo Information about data stored in the tensor
     */
    constructor(radius, tensorInfo) {
        super(tensorInfo);

        this.#radius = radius;
        this.#stateDim = this.#radius * 2 + 1;
    }

    id() {
        return `${FlashlightStateGenerator.ID}[${this.#radius}, ${this.tensorInfo.name}]`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.TYPE] = FlashlightStateGenerator.ID;
        const parameters = info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS] = {};
        parameters[TrainingInformationKey.ENV_KEYS.STATE_KEYS.PARAMETERS_KEYS.FLASHLIGHT.RADIUS] = this.#radius;
        info[TrainingInformationKey.ENV_KEYS.STATE_KEYS.REPRESENTATION] = this.tensorInfo.name;

        return info;
    }

    shape() {
        return { x: this.#stateDim, y: this.#stateDim, z: this.tensorInfo.layers };
    }

    state(game) {
        const gameState = game.getState();

        // Get player's position
        // TODO: Implement a game with multiple players ? Here we just need to define a parameter to select the player and define special values for each player
        const playerPosition = gameState.players[0].pos;

        const stateDim = this.#stateDim;
        const state = tf.buffer([ stateDim, stateDim, this.tensorInfo.layers ]);

        // Define state bounds
        const minX = playerPosition.x - this.#radius;
        const maxX = playerPosition.x + this.#radius + 1; // Exclusive bound
        const minY = playerPosition.y - this.#radius;
        const maxY = playerPosition.y + this.#radius + 1; // Exclusive bound

        const toLocalX = x => x - minX;
        const toLocalY = y => y - minY;

        // Define ground and walls
        for (let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                const localX = toLocalX(x);
                const localY = toLocalY(y);

                if (x < 0 || x >= gameState.map.board.dimX || y < 0 || y >= gameState.map.board.dimY || gameState.map.floor[x][y] !== 1) {
                    state.set(this.tensorInfo.value(WALL), localX, localY, this.tensorInfo.layer(WALL));
                } else {
                    for (let i = 0; i < this.tensorInfo.layers; i++) {
                        state.set(this.tensorInfo.value(NONE), localX, localY, i);
                    }
                }
            }
        }

        const markVisibleEntity = entity => {
            const x = entity.pos.x;
            const y = entity.pos.y;

            // Get value and layer for this entity
            const value = this.tensorInfo.value(entity);
            const layer = this.tensorInfo.layer(entity);

            // Check value and layer
            if (layer === NO_LAYER) {
                return;
            }
            if (value === undefined) {
                throw new Error(`Unknown value: ${value} at (${x}, ${y}, ${layer})`);
            }

            // Define entity in tensor
            if (x >= minX && x < maxX && y >= minY && y < maxY) {
                state.set(value, toLocalX(x), toLocalY(y), layer);
            }
        };

        // Iterate over entities and define them in tensor
        game.forEach(markVisibleEntity);

        return state.toTensor();
    }
}

const Generator = {
    FLASHLIGHT: "FLASHLIGHT",
    NORMAL: "NORMAL"
};

export { FlashlightStateGenerator, NormalStateGenerator, Generator };
