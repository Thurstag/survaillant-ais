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

/**
 * Training environment
 */
class Environment {
    policy;
    #game;
    stateGenerator;
    #stats = new GamesStats();

    /**
     * Constructor for an uninitialized environment
     *
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     */
    constructor(policy, stateGenerator) {
        this.policy = policy;
        this.stateGenerator = stateGenerator;
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
     * Get the shape of state tensors
     *
     * @return {{x: number, y: number, z: number}} Dimension on all axes
     */
    get stateShape() {
        return this.stateGenerator.shape();
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
     * @return {Tensor} State
     */
    state() {
        return this.stateGenerator.state(this.#game);
    }

    /**
     * Apply the given action
     *
     * @param {number} action Action to apply (in [0, {@link SurvaillantNetwork#ACTIONS_COUNT}))
     * @return {{reward: number, done: boolean}} Action consequence (a reward and if the game is done or not)
     */
    step(action) {
        // Apply action
        const direction = Survaillant.PlayerMoves[action];
        const consequence = this.#game.movePlayer(direction[0], direction[1]);

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
     */
    constructor(map, policy, stateGenerator) {
        super(policy, stateGenerator);

        this.#map = map;
    }

    createGame() {
        return Survaillant.createGame(this.#map);
    }

    id() {
        return `${SingleMapEnvironment.ID}[${this.#map.name}]_${this.policy.name}_${this.stateGenerator.id()}`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.TYPE] = SingleMapEnvironment.ID;
        info[TrainingInformationKey.ENV_KEYS.MAPS] = [ this.#map.name ];
        info[TrainingInformationKey.ENV_KEYS.POLICY] = this.policy.name;
        info[TrainingInformationKey.ENV_KEYS.STATE] = this.stateGenerator.info();

        return info;
    }
}

/**
 * Single map training environment where we can use items
 */
class SingleMapEnvironmentWithItems extends SingleMapEnvironment {
    static ID = "singleWithItems";

    #map;

    /**
     * Constructor
     *
     * @param {Map} map Map used for training
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     */
    constructor(map, policy, stateGenerator) {
        super(map, policy, stateGenerator);
        this.#map = map;

    }


    id() {
        return `${SingleMapEnvironmentWithItems.ID}[${this.#map.name}]_${this.policy.name}_${this.stateGenerator.id()}`;
    }

    info() {
        const info = super.info();
        info[TrainingInformationKey.ENV_KEYS.TYPE] = SingleMapEnvironmentWithItems.ID;
        return info;
    }

    /**
     * Override the state generator to use items
     *
     * @param {number} action Action to apply (in [0, 16)) 4 actions for movement and 4 actions for each 3 items
     * @return {{reward: number, done: boolean}} Action consequence (a reward and if the game is done or not)
     */
    step(action) {
        // Apply action
        const directionOrItem = Survaillant.PlayerMovesWithItems[action];

        const consequence = directionOrItem[0] === "movement" ?
            super.game.movePlayer(directionOrItem[1], directionOrItem[2]) :
            super.game.useItem(directionOrItem[0], directionOrItem[1], directionOrItem[2]);

        // Deduce reward/done
        const { reward, done } = this.policy instanceof MapRewardPolicy ? this.policy.get(consequence) : this.policy.get(consequence, super.game);

        // Add reward to env/game stats
        super.game.stats.addReward(reward);
        if (done) {
            super.stats.add(super.game.stats);
        }

        return { reward, done };
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
     */
    constructor(maps, policy, stateGenerator) {
        super(policy, stateGenerator);

        this.#maps = maps;
    }

    createGame() {
        return Survaillant.createGame(this.#maps[tf.randomUniform([ 1 ], 0, this.#maps.length, "int32").dataSync()[0]]);
    }

    id() {
        return `${ListMapEnvironment.ID}[${this.#maps.map(m => m.name).join(", ")}]_${this.policy.name}_${this.stateGenerator.id()}`;
    }

    info() {
        const info = {};
        info[TrainingInformationKey.ENV_KEYS.TYPE] = ListMapEnvironment.ID;
        info[TrainingInformationKey.ENV_KEYS.MAPS] = this.#maps.map(m => m.name);
        info[TrainingInformationKey.ENV_KEYS.POLICY] = this.policy.name;
        info[TrainingInformationKey.ENV_KEYS.STATE] = this.stateGenerator.info();

        return info;
    }
}

export { SingleMapEnvironment, SingleMapEnvironmentWithItems, ListMapEnvironment };
