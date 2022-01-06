/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { Lazy } from "@tsdotnet/lazy";
import fs from "fs";
import path from "path";
import url from "url";
import { GameStats } from "../../common/game/stats.js";
import Game from "./models/games/Game.js";
import Map from "./models/games/Map.js";

process.on("SIGINT", () => {
    process.exit();
});

const mapLoader = new Lazy(() => {
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const mapFolder = path.resolve(__dirname, path.join("..", "assets", "dungeons"));

    return fs.readdirSync(mapFolder).map(dungeon => new Map(JSON.parse(fs.readFileSync(mapFolder + "/" + dungeon + "/info.json", "utf8"))));
});
const ITEMS = [ "arrow", "bomb", "dynamite" ];
const MOVE_TYPE = {
    MOVEMENT: "movement",
    ARROW: ITEMS[0],
    BOMB: ITEMS[1],
    DYNAMITE: ITEMS[2]
};

const Survaillant = {
    getMaps: () => mapLoader.value,
    createGame: (map) => {
        return new SurvaillantGame(map, "solo");
    },
    PlayerMoves: [
        [ MOVE_TYPE.MOVEMENT, -1, 0 ], [ MOVE_TYPE.MOVEMENT, 1, 0 ], [ MOVE_TYPE.MOVEMENT, 0, -1 ], [ MOVE_TYPE.MOVEMENT, 0, 1 ],
        [ MOVE_TYPE.ARROW, -1, 0 ], [ MOVE_TYPE.ARROW, 1, 0 ], [ MOVE_TYPE.ARROW, 0, -1 ], [ MOVE_TYPE.ARROW, 0, 1 ],
        [ MOVE_TYPE.BOMB, -1, 0 ], [ MOVE_TYPE.BOMB, 1, 0 ], [ MOVE_TYPE.BOMB, 0, -1 ], [ MOVE_TYPE.BOMB, 0, 1 ],
        [ MOVE_TYPE.DYNAMITE, -1, 0 ], [ MOVE_TYPE.DYNAMITE, 1, 0 ], [ MOVE_TYPE.DYNAMITE, 0, -1 ], [ MOVE_TYPE.DYNAMITE, 0, 1 ]
    ],
    ActionConsequence: {
        MOVED: "MOVED",
        BAD_MOVEMENT: "BAD_MOVEMENT",
        GAME_OVER: "GAME_OVER",
        KILL: "KILL",
        ITEM_MISSING: "ITEM_MISSING"
    },
    MOVE_TYPE, ITEMS
};

// TODO: Doc
class SurvaillantGame {
    #stats;

    // TODO: Doc
    constructor(map) {
        this.game = new Game(map, "solo");
        this.game.addPayer({ id: 0, account: null }, "A furtive bot");
        this.#stats = new GameStats(this);
    }

    /**
     * Get game's statistics
     *
     * @return {GameStats} Statistics
     */
    get stats() {
        return this.#stats;
    }

    // TODO: Doc
    getState() {
        return this.game.get();
    }

    /**
     * Iterate over game's entities and call the given callback when an entity is encountered
     *
     * @param {function(Entity|MonsterSpawn)} onEntity
     */
    forEach(onEntity) {
        let gameInstance = this.game;

        gameInstance.monsters.forEach(onEntity);
        gameInstance.chests.forEach(onEntity);
        gameInstance.traps.forEach(onEntity);
        gameInstance.monsterSpawns.forEach(onEntity);
        gameInstance.players.forEach(onEntity);
    }

    /**
     * Execute the given action
     *
     * @param {[string, number, number]} Action (see {@link Survaillant#PlayerMoves})
     * @return {string} Action consequence
     */
    execute([ type, dx, dy ]) {
        return type === MOVE_TYPE.MOVEMENT ? this.#movePlayer(dx, dy) : this.#useItem(type, dx, dy);
    }

    // TODO: Doc
    #movePlayer(dx, dy) {
        const player = this.game.players[0];

        // Params check
        if (dx === undefined || dy === undefined) throw "dx and dy required";

        let choiceStatus = this.game.checkPlayerMovementChoice(player, { dx, dy });
        if (choiceStatus.badMovement) {
            return this.#stats.gameOverReason = Survaillant.ActionConsequence.BAD_MOVEMENT;
        }

        // Good movement
        const oldKillCount = this.game.nbKilledMonsters;
        if (this.game.allMvmtDone()) {
            this.game.nextTurn();

            if (this.game.gameOver) {
                return this.#stats.gameOverReason = Survaillant.ActionConsequence.GAME_OVER;
            }
        }

        return this.game.nbKilledMonsters > oldKillCount ? Survaillant.ActionConsequence.KILL : Survaillant.ActionConsequence.MOVED;
    }

    /**
     * Use an item
     *
     * @param {string} item Item to use
     * @param {number} dx Item use direction in x-axis
     * @param {number} dy Item use direction in y-axis
     * @return {string} Action consequence
     */
    #useItem(item, dx, dy) {
        const player = this.game.players[0];

        if (item === undefined || !ITEMS.includes(item)) {
            throw "A correct Item is required";
        }

        if (player.inventory[item] === 0) {
            return this.#stats.gameOverReason = Survaillant.ActionConsequence.ITEM_MISSING;
        }

        // Use item
        player.selectedItem = item;
        player.nextMove = null;
        return this.#movePlayer(dx, dy);
    }
}

export default Survaillant;
