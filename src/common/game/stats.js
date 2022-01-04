/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import fs from "fs/promises";
import Survaillant from "../../survaillant/src/index.js";

/**
 * Statistics of multiple games
 */
class GamesStats {
    static #HEADERS = "mapName,score,nbTurn,nbKilled,nbChests,comboScore,gameOverReason";

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
     * Add the given games' statistics
     *
     * @param {GamesStats} stats Games statistics to add
     */
    addAll(stats) {
        this.#stats = this.#stats.concat(stats.#stats);
    }

    /**
     * Generate a summary of statistics of stored games
     *
     * @return {{
     * rewards: {std: number, min: number, max: number, mean: number, sum: number},
     * turns: {std: number, min: number, max: number, mean: number, sum: number},
     * killed: {min: number, max: number, mean: number, sum: number},
     * chests: {min: number, max: number, mean: number, sum: number},
     * combo: {min: number, max: number, mean: number, sum: number},
     * score: {min: number, max: number, mean: number, sum: number}
     * }}
     * Statistics about rewards obtained, number of turns reached, chests opened, score, combo score, and monsters killed
     */
    summary() {
        const turns = { min: 0, max: 0, sum: 0, mean: 0, std: 0 };
        const rewards = { min: 0, max: 0, sum: 0, mean: 0, std: 0 };
        const killed = { min: 0, max: 0, sum: 0, mean: 0 };
        const chests = { min: 0, max: 0, sum: 0, mean: 0 };
        const combo = { min: 0, max: 0, sum: 0, mean: 0 };
        const score = { min: 0, max: 0, sum: 0, mean: 0 };
        const statistics = { turns, rewards, killed, chests, combo, score };

        if (this.#stats.length === 0) {
            return statistics;
        }

        // Initialize max and min
        for (const stats of Object.values(statistics)) {
            stats.min = Number.POSITIVE_INFINITY;
            stats.max = Number.NEGATIVE_INFINITY;
        }

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

            // Update killed stats
            const killedCount = stats.killedMonsters;
            killed.max = Math.max(killed.max, killedCount);
            killed.min = Math.min(killed.min, killedCount);
            killed.sum += killedCount;

            // Update chests stats
            const openedChestsCount = stats.chests;
            chests.max = Math.max(chests.max, openedChestsCount);
            chests.min = Math.min(chests.min, openedChestsCount);
            chests.sum += openedChestsCount;

            // Update combo stats
            const comboScore = stats.comboScore;
            combo.max = Math.max(combo.max, comboScore);
            combo.min = Math.min(combo.min, comboScore);
            combo.sum += comboScore;

            // Update score stats
            const totalScore = stats.score;
            score.max = Math.max(score.max, totalScore);
            score.min = Math.min(score.min, totalScore);
            score.sum += totalScore;
        }

        // Update mean
        const invLength = 1 / this.#stats.length;
        for (const stats of Object.values(statistics)) {
            if (stats.sum) {
                stats.mean = stats.sum * invLength;
            }
        }

        // Compute standard deviation
        for (const stats of this.#stats) {
            turns.std += Math.pow(stats.turns - turns.mean, 2);
            rewards.std += Math.pow(stats.rewards - rewards.mean, 2);
        }
        turns.std = Math.sqrt(invLength * turns.std);
        rewards.std = Math.sqrt(invLength * rewards.std);

        return statistics;
    }

    /**
     * Convert statistics of stored games into a CSV
     *
     * @return {string} CSV with the following columns: mapName, score, nbTurn, nbKilled, nbChests, comboScore, gameOverReason
     */
    toCSV() {
        return `${GamesStats.#HEADERS}\n${this.#stats.map(s => s.toCSV()).join("\n")}`;
    }

    /**
     * Write statistics into the given file (format: CSV)
     *
     * @param {string} file Path to the file
     * @return {Promise<void>} Promise
     */
    async writeTo(file) {
        await fs.writeFile(file, this.toCSV(), "utf-8");
    }

    /**
     * Write statistics per epoch into the given file (format: CSV)
     *
     * @param {GamesStats[]} stats Games statistics per epoch
     * @param {string} file Path to the file
     * @return {Promise<void>} Promise
     */
    static async writeTo(stats, file) {
        await fs.writeFile(file, `${GamesStats.#HEADERS},epoch\n${stats.flatMap((games, epoch) => games.#stats.map(g => `${g.toCSV()},${epoch}`)).join("\n")}`);
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
     * Get the game over reason(either {@link Survaillant#ActionConsequence#BAD_MOVEMENT},
     *  {@link Survaillant#ActionConsequence#GAME_OVER} or {@link Survaillant#ActionConsequence#ITEM_MISSING})
     *
     * @return {String} Reason
     */
    get gameOverReason() {
        return this.#reason;
    }

    /**
     * Set the game over reason
     *
     * @param value New reason (either {@link Survaillant#ActionConsequence#BAD_MOVEMENT},
     *  {@link Survaillant#ActionConsequence#GAME_OVER} or {@link Survaillant#ActionConsequence#ITEM_MISSING})
     */
    set gameOverReason(value) {
        if (value !== Survaillant.ActionConsequence.BAD_MOVEMENT &&
         value !== Survaillant.ActionConsequence.GAME_OVER &&
         value !== Survaillant.ActionConsequence.ITEM_MISSING) {
            throw new Error(`Unknown game over reason: ${value}`);
        }
        this.#reason = value;
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
     * Add a reward
     *
     * @param {number} reward Reward
     */
    addReward(reward) {
        this.#rewards += reward;
    }

    /**
     * Convert stored statistics into a CSV line defining values for the following columns: mapName,score,nbTurn,nbKilled,nbChests,comboScore,gameOverReason
     *
     * @return {string} CSV line
     */
    toCSV() {
        return `${this.mapName},${this.score},${this.turns},${this.killedMonsters},${this.chests},${this.comboScore},${this.gameOverReason}`;
    }
}

export { GamesStats, GameStats };
