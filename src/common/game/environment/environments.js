/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import Survaillant from "../../../survaillant/src/index.js";
import { GamesStats } from "../stats.js";
import { MapRewardPolicy } from "./reward.js";

/**
 * Training environment
 */
class Environment {
    #policy;
    #game;
    #stateGenerator;
    #stats = new GamesStats();

    /**
     * Constructor
     *
     * @param {MapRewardPolicy|ScoreDrivenPolicy} policy Reward policy
     * @param {StateGenerator} stateGenerator State generator
     */
    constructor(policy, stateGenerator) {
        this.#policy = policy;
        this.#stateGenerator = stateGenerator;
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
        return this.#stateGenerator.shape();
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
        this.#policy.reset();
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
        return this.#stateGenerator.state(this.#game);
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
        const { reward, done } = this.#policy instanceof MapRewardPolicy ? this.#policy.get(consequence) : this.#policy.get(consequence, this.#game);

        // Add reward to env/game stats
        this.#game.stats.addReward(reward);
        if (done) {
            this.#stats.add(this.#game.stats);
        }

        return { reward, done };
    }
}

/**
 * Training environment where the network trains only one map
 */
class SingleMapEnvironment extends Environment {
    #map;

    /**
     * Constructor
     *
     * @param {Map} map Map to play
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
}

// TODO: Create an environment that selects a random map in a list for each game

export { SingleMapEnvironment };