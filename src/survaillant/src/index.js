/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import fs from "fs";
import * as tf from "@tensorflow/tfjs";
import { GameStats } from "../../common/game/stats.js";

process.on("SIGINT", () => { process.exit(); });

// Models
import Map from "./models/games/Map.js";
import Game from "./models/games/Game.js";

// ======== data ========
let maps = [];

// Init
loadData();

function loadData() {
    const mapFolder = "src/survaillant/assets/dungeons";
    let mapFiles = fs.readdirSync(mapFolder);
    mapFiles.forEach(dugeon => {
        // Read map json file:
        let mapJson = JSON.parse(fs.readFileSync(mapFolder + "/" + dugeon + "/info.json", "utf8"));
        let map = new Map(mapJson);
        maps.push(map);
    });
}


const Survaillant = {
    getMaps: () => {
        return maps;
    },
    createGame: (map) => {
        return new SurvaillantGame(map, "solo");
    },
    PlayerMoves: [ [ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ 0, 1 ] ],
    ActionConsequence: {
        MOVED: "MOVED",
        BAD_MOVEMENT: "BAD_MOVEMENT",
        GAME_OVER: "GAME_OVER"
    }
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
    getState() { return this.game.get(); }

    // TODO: Doc
    getStateAsTensor(w, h) {
        let state = this.game.get();

        // Ground :           0
        // Wall :             1
        // Chest :            2
        // Trap positon 0 :   3
        // Trap positon 1 :   4
        // Trap positon 2 :   5
        // Monster spawn 0 :  6
        // Monster spawn 1 :  7
        // Monster spawn 2 :  8
        // Monster spawn 3 :  9

        // Vide :             0
        // Player :           1
        // Monster :          2

        const buffer = tf.buffer([ 1, h, w, 2 ]);
        const DUNGEON = 0;
        const ENTITY = 1;

        // Init buffers with default values
        for (let i = 0; i < h; i++)
            for (let j = 0; j < w; j++)
                buffer.set(1, 0, i, j, DUNGEON);


        for (let i = 0; i < h; i++)
            for (let j = 0; j < w; j++)
                buffer.set(0, 0, i, j, ENTITY);

        // floor
        let wLimit = Math.min(state.map.board.dimX, w);
        let hLimit = Math.min(state.map.board.dimY, h);
        for (let i = 0; i < wLimit; i++)
            for (let j = 0; j < hLimit; j++)
                if (state.map.floor[i][j] === 1)
                    buffer.set(0, 0, i, j, DUNGEON);

        // chests
        state.chests.forEach(chest => {
            buffer.set(2, 0, chest.pos.x, chest.pos.y, DUNGEON);
        });
        // Traps
        state.traps.forEach(trap => {
            buffer.set(trap.loop + 3, 0, trap.pos.x, trap.pos.y, DUNGEON);
        });
        // Spawn
        state.monsterSpawns.forEach(monsterSpawn => {
            if(monsterSpawn.monsterSpawning)
                buffer.set(9 - monsterSpawn.timeBeforeSpawn, 0, monsterSpawn.pos.x, monsterSpawn.pos.y, DUNGEON);
        });

        // Entities
        // Player
        let playerPos = state.players[0].pos;
        buffer.set(1, 0, playerPos.x, playerPos.y, ENTITY);

        // Monsters
        state.monsters.forEach(monster => {
            buffer.set(2, 0, monster.pos.x, monster.pos.y, ENTITY);
        });

        return buffer.toTensor();
    }

    // TODO: Doc
    movePlayer(dx, dy) {
        let player = this.game.players[0];

        // Params check
        if (dx === undefined || dy === undefined) throw "dx and dy required";

        let choiceStatus = this.game.checkPlayerMovementChoice(player, { dx, dy });
        if (choiceStatus.badMovement) {
            return this.#stats.gameOverReason = Survaillant.ActionConsequence.BAD_MOVEMENT;
        }

        // Good movement
        if (this.game.allMvmtDone()) {
            this.game.nextTurn();

            if (this.game.gameOver) {
                return this.#stats.gameOverReason = Survaillant.ActionConsequence.GAME_OVER;
            }
        }
        return Survaillant.ActionConsequence.MOVED;
    }

    // TODO: Doc
    selectItem(item) {
        const availableItems = [ "", "arrow", "bomb", "dynamite" ];

        let player = this.game.player[0];

        if (item == undefined || !availableItems.includes(item))
            throw "A correct Item is required";

        if (player.inventory[item] == 0) // The player has no item
            return -1;

        // set item to the player
        player.selectedItem = item;
        player.nextMove = null;
    }
}

export default Survaillant;
