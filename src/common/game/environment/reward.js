/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import Survaillant from "../../../survaillant/src/index.js";

const GAME_OVER_INFO = { reward: -5, done: true };
const MOVED_INFO = { reward: 1, done: false };

const BANDIT_POLICY = {};
BANDIT_POLICY[Survaillant.ActionConsequence.GAME_OVER] = GAME_OVER_INFO;
BANDIT_POLICY[Survaillant.ActionConsequence.BAD_MOVEMENT] = { reward: -1, done: false };
BANDIT_POLICY[Survaillant.ActionConsequence.MOVED] = MOVED_INFO;
BANDIT_POLICY[Survaillant.ActionConsequence.KILL] = BANDIT_POLICY[Survaillant.ActionConsequence.MOVED];

const NEUTRAL_POLICY = {};
NEUTRAL_POLICY[Survaillant.ActionConsequence.GAME_OVER] = GAME_OVER_INFO;
NEUTRAL_POLICY[Survaillant.ActionConsequence.BAD_MOVEMENT] = NEUTRAL_POLICY[Survaillant.ActionConsequence.GAME_OVER];
NEUTRAL_POLICY[Survaillant.ActionConsequence.MOVED] = MOVED_INFO;
NEUTRAL_POLICY[Survaillant.ActionConsequence.KILL] = NEUTRAL_POLICY[Survaillant.ActionConsequence.MOVED];

const DOOM_SLAYER_POLICY = { ...NEUTRAL_POLICY };
DOOM_SLAYER_POLICY[Survaillant.ActionConsequence.KILL] = { reward: 5, done: false }; // TODO: Adjust reward's value ?

/**
 * Reward policy backed by a map
 */
class MapRewardPolicy {
    #_policy;

    /**
     * Constructor
     *
     * @param {Object.<String, {reward: number, done: false}>} policy Map that defines the reward for each consequence
     */
    constructor(policy) {
        this.#_policy = policy;
    }

    /**
     * Get the reward/done status for the given consequence
     *
     * @param {string} consequence Action consequence (One of {@link Survaillant#ActionConsequence})
     * @return {{reward: number, done: boolean}} Reward and if the game is done or not
     */
    get(consequence) {
        return this.#_policy[consequence];
    }

    /**
     * Reset
     */
    reset() {
        // Do nothing
    }
}

const RewardPolicies = {};

/** Policy that neglects bad movements */
RewardPolicies.BANDIT = new MapRewardPolicy(BANDIT_POLICY);

/** Policy that ensures that all rules are respected */
RewardPolicies.NEUTRAL = new MapRewardPolicy(NEUTRAL_POLICY);

/** Policy based on {@link NEUTRAL} that promotes kills */
RewardPolicies.DOOM_SLAYER = new MapRewardPolicy(DOOM_SLAYER_POLICY);

/** Policy based on {@link NEUTRAL} that uses the in-game score to reward the player */
RewardPolicies.SCORE_BASED = class ScoreDrivenPolicy {
    #score = 0;

    /**
     * Get the reward/done status for the given consequence
     *
     * @param {string} consequence Action consequence (One of {@link Survaillant#ActionConsequence})
     * @param {SurvaillantGame} game Game
     * @return {{reward: number, done: boolean}} Reward and if the game is done or not
     */
    get(consequence, game) {
        // Compute reward
        const res = consequence === Survaillant.ActionConsequence.GAME_OVER || consequence === Survaillant.ActionConsequence.BAD_MOVEMENT ?
            RewardPolicies.NEUTRAL.get(consequence) : { reward: Math.abs(game.stats.score - this.#score), done: false };

        // Update last score
        this.#score = game.stats.score;

        return res;
    }

    /**
     * Reset
     */
    reset() {
        this.#score = 0;
    }
}

/**
 * Create a reward policy based on the given identifier
 *
 * @param {string} id Policy's identifier
 * @return {MapRewardPolicy|ScoreDrivenPolicy} Policy
 */
function createPolicy(id) {
    const policy = RewardPolicies[id];

    if (policy === undefined) {
        throw new Error("Unknown reward policy: " + id);
    }

    // Instantiate it if it's a class
    return policy.prototype && policy.prototype.constructor ? new policy.prototype.constructor() : policy;
}

const RewardPolicy = {
    ...(Object.keys(RewardPolicies).reduce((a, b) => {
        a[b] = b;
        return a;
    }, {}))
};

export { createPolicy, MapRewardPolicy, RewardPolicy };
