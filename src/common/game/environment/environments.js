/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import Survaillant from "../../../survaillant/src/index.js";
import { GamesStats } from "../stats.js";
import { TrainingInformationKey } from "../training.js";
import { MapRewardPolicy } from "./reward.js";

const MOVEMENT_ACTIONS_COUNT = Survaillant.PlayerMoves.filter(m => m[0] === Survaillant.MOVE_TYPE.MOVEMENT).length;
const ITEMS_COUNT = Survaillant.ITEMS.length;

/**
 * Training environment
 */
class Environment {
    policy;
    items;
    #game;
    stateGenerator;
    #stats = new GamesStats();

    /**
     * Constructor for an uninitialized environment
     *
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     * @param {boolean} items Enable or not items
     */
    constructor(policy, stateGenerator, items) {
        this.policy = policy;
        this.stateGenerator = stateGenerator;
        this.items = items;
    }

    /**
     * Get the current game
     *
     * @return {SurvaillantGame} Game
     */
    get game() {
        return this.#game;
    }

    /**
     * Get the shape for each state's tensors
     *
     * @return {number[][]} Dimensions for each axis for each tensor
     */
    get shapes() {
        return this.items ? [ this.stateGenerator.shape(), [ ITEMS_COUNT ] ] : [ this.stateGenerator.shape() ];
    }

    /**
     * Get environment's games statistics
     *
     * @return {GamesStats} Statistics
     */
    get stats() {
        return this.#stats;
    }

    /**
     * Get the number of possible actions
     *
     * @return {number} Actions
     */
    get actionsCount() {
        return this.items ? Survaillant.PlayerMoves.length : MOVEMENT_ACTIONS_COUNT;
    }

    /**
     * Reset environment
     */
    reset() {
        this.#game = this.createGame();
        this.policy.reset();
    }

    /**
     * Create a game
     *
     * @return {SurvaillantGame} Game
     */
    createGame() {
        throw new Error("createGame isn't implemented");
    }

    /**
     * Get the state of the current game
     *
     * @return {Tensor[]} Map and items if they are enabled, otherwise only the map
     */
    state() {
        if (this.items) {
            const itemsBuffer = tf.buffer([ ITEMS_COUNT ]);
            const items = this.#game.getState().players[0].inventory;
            [ items.arrow, items.bomb, items.dynamite ].forEach((count, i) => itemsBuffer.set(count, i));

            return [ this.stateGenerator.state(this.#game), itemsBuffer.toTensor() ];
        }

        return [ this.stateGenerator.state(this.#game) ];
    }

    /**
     * Apply the given action
     *
     * @param {number} action Index of the action to apply (in [0, {@link Environment#actionsCount}))
     * @return {{reward: number, done: boolean}} Action consequence (a reward and if the game is done or not)
     */
    step(action) {
        // Apply action
        const move = Survaillant.PlayerMoves[action];
        const consequence = this.#game.execute(move);

        // Deduce reward/done
        const { reward, done } = this.policy instanceof MapRewardPolicy ? this.policy.get(consequence) : this.policy.get(consequence, this.#game);

        // Add reward to env/game stats
        this.#game.stats.addReward(reward);
        if (done) {
            this.#stats.add(this.#game.stats);
        }

        return { reward, done };
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
     * Get information about the environment
     *
     * @return {{state: Object, type: string, maps: String[], policy: string}} Information
     */
    info() {
        throw new Error("info isn't implemented");
    }
}

/**
 * Training environment where the network trains only one map
 */
class SingleMapEnvironment extends Environment {
    static ID = "single";

    #map;

    /**
     * Constructor
     *
     * @param {Map} map Map used for training
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     * @param {boolean} items Enable or not items
     */
    constructor(map, policy, stateGenerator, items) {
        super(policy, stateGenerator, items);

        this.#map = map;
    }

    createGame() {
        return Survaillant.createGame(this.#map);
    }

    id() {
        return `${SingleMapEnvironment.ID}[${this.#map.name}]_${this.policy.name}_${this.stateGenerator.id()}${this.items ? "_with_items" : ""}`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.TYPE] = SingleMapEnvironment.ID;
        info[TrainingInformationKey.ENV_KEYS.MAPS] = [ this.#map.name ];
        info[TrainingInformationKey.ENV_KEYS.POLICY] = this.policy.name;
        info[TrainingInformationKey.ENV_KEYS.STATE] = this.stateGenerator.info();
        info[TrainingInformationKey.ENV_KEYS.ITEMS] = this.items;

        return info;
    }
}

/**
 * Training environment where the network trains multiple maps (one map is randomly selected for each game)
 */
class ListMapEnvironment extends Environment {
    static ID = "list";

    #maps;

    /**
     * Constructor
     *
     * @param {Map[]} maps Maps used for training
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     * @param {boolean} items Enable or not items
     */
    constructor(maps, policy, stateGenerator, items) {
        super(policy, stateGenerator, items);

        this.#maps = maps;
    }

    createGame() {
        return Survaillant.createGame(this.#maps[tf.randomUniform([ 1 ], 0, this.#maps.length, "int32").dataSync()[0]]);
    }

    id() {
        return `${ListMapEnvironment.ID}[${this.#maps.map(m => m.name).join(", ")}]_${this.policy.name}_${this.stateGenerator.id()}${this.items ? "_with_items" : ""}`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.TYPE] = ListMapEnvironment.ID;
        info[TrainingInformationKey.ENV_KEYS.MAPS] = this.#maps.map(m => m.name);
        info[TrainingInformationKey.ENV_KEYS.POLICY] = this.policy.name;
        info[TrainingInformationKey.ENV_KEYS.STATE] = this.stateGenerator.info();
        info[TrainingInformationKey.ENV_KEYS.ITEMS] = this.items;

        return info;
    }
}

export { SingleMapEnvironment, ListMapEnvironment };
