/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import Survaillant from "../../survaillant/src/index.js";

/**
 * Statistics of multiple games
 */
class GamesStats {
    #stats = [];

    /**
     * Add the given game's statistics
     *
     * @param {GameStats} stats Game's statistics
     */
    add(stats) {
        this.#stats.push(stats);
    }

    /**
     * Generate a summary of statistics of stored games
     *
     * @return {{rewards: {std: number, min: number, max: number, mean: number, sum: number}, turns: {std: number, min: number, max: number, mean: number, sum: number}}}
     * Statistics about rewards obtained and number of turns reached
     */
    summary() {
        let turns = {
            min: 0,
            max: 0,
            sum: 0,
            mean: 0,
            std: 0
        };
        let rewards = {
            min: 0,
            max: 0,
            sum: 0,
            mean: 0,
            std: 0
        };

        if (this.#stats.length === 0) {
            return {
                turns: turns,
                rewards: rewards
            };
        }

        turns.min = Number.MAX_VALUE;
        turns.max = Number.MIN_VALUE;
        rewards.min = Number.MAX_VALUE;
        rewards.max = Number.MIN_VALUE;
        for (const stats of this.#stats) {
            // Update turns stats
            const turnsCount = stats.turns;
            turns.max = Math.max(turns.max, turnsCount);
            turns.min = Math.min(turns.min, turnsCount);
            turns.sum += turnsCount;

            // Update rewards stats
            const rewardsSum = stats.rewards;
            rewards.max = Math.max(rewards.max, rewardsSum);
            rewards.min = Math.min(rewards.min, rewardsSum);
            rewards.sum += rewardsSum;
        }

        const invLength = 1 / this.#stats.length;
        turns.mean = turns.sum * invLength;
        rewards.mean = rewards.sum * invLength;

        // Compute standard deviation
        for (const stats of this.#stats) {
            turns.std += Math.pow(stats.turns - turns.mean, 2);
            rewards.std += Math.pow(stats.rewards - rewards.mean, 2);
        }
        turns.std = Math.sqrt(invLength * turns.std);
        rewards.std = Math.sqrt(invLength * rewards.std);

        return {
            turns: turns,
            rewards: rewards
        };
    }

    /**
     * Convert statistics of stored games into a CSV
     *
     * @return {string} CSV with the following columns: mapName, score, nbTurn, nbKilled, nbChests, comboScore, gameOverReason
     */
    toCSV() {
        return `mapName, score, nbTurn, nbKilled, nbChests, comboScore, gameOverReason\n${this.#stats.map(s => s.toCSV()).join("\n")}`;
    }
}

/**
 * Statistics of a game
 */
class GameStats {
    #game;
    #reason;
    #rewards;

    /**
     * Constructor
     *
     * @param {SurvaillantGame} game Game instance
     */
    constructor(game) {
        this.#game = game.game;
        this.#reason = undefined;
        this.#rewards = 0;
    }

    /**
     * Get map's name
     *
     * @return {String} Name
     */
    get mapName() {
        return this.#game.map.name;
    }

    /**
     * Get the total score
     *
     * @return {Number} Score
     */
    get score() {
        return this.#game.calculateTotalScore();
    }

    /**
     * Get the number of turns reached without death or bad movement
     *
     * @return {number} Turns
     */
    get turns() {
        return this.#game.turn;
    }

    /**
     * Get the number of monsters killed
     *
     * @return {number} Killed monsters
     */
    get killedMonsters() {
        return this.#game.nbKilledMonsters;
    }

    /**
     * Get the number of chest opened
     *
     * @return {number|*} Opened chests
     */
    get chests() {
        return this.#game.nbOpenedChests;
    }

    /**
     * Get the combo score
     *
     * @return {number} Score
     */
    get comboScore() {
        return this.#game.comboScore;
    }

    /**
     * Get the game over reason (either {@link Survaillant#ActionConsequence#BAD_MOVEMENT} or {@link Survaillant#ActionConsequence#GAME_OVER})
     *
     * @return {String} Reason
     */
    get gameOverReason() {
        return this.#reason;
    }

    /**
     * Set the game over reason
     *
     * @param value New reason (either {@link Survaillant#ActionConsequence#BAD_MOVEMENT} or {@link Survaillant#ActionConsequence#GAME_OVER})
     */
    set gameOverReason(value) {
        if (value !== Survaillant.ActionConsequence.BAD_MOVEMENT && value !== Survaillant.ActionConsequence.GAME_OVER) {
            throw new Error(`Unknown game over reason: ${value}`);
        }

        this.#reason = value;
    }

    /**
     * Add a reward
     *
     * @param {number} reward Reward
     */
    addReward(reward) {
        this.#rewards += reward;
    }

    /**
     * Get the sum of rewards obtained
     *
     * @return {number} Rewards
     */
    get rewards() {
        return this.#rewards;
    }

    /**
     * Convert stored statistics into a CSV line defining values for the following columns: mapName, score, nbTurn, nbKilled, nbChests, comboScore, gameOverReason
     *
     * @return {string} CSV line
     */
    toCSV() {
        return `${this.mapName}, ${this.score}, ${this.turns}, ${this.killedMonsters}, ${this.chests}, ${this.comboScore}, ${this.gameOverReason}`;
    }
}

export { GamesStats, GameStats };
