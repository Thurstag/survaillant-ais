/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import fs from "fs";
import * as tf from "@tensorflow/tfjs";

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
    getMaps: () => { return maps; },
    createGame: (map) => { return new SurvaillantGame(map, "solo"); }
};

class SurvaillantGame {
    constructor(map) {
        this.game = new Game(map, "solo");
        let dummyClient = { id: 0, account: null };
        this.game.addPayer(dummyClient, "A furtive bot");
    }

    getState() { return this.game.get(); }

    getStateMatrix({ w, h }) {
        let state = this.game.get();

        //// DUNGEON(0)
        // Ground :           0
        // Wall :             1
        // Chest :            2
        // Trap positon 0 :   3
        // Trap positon 1 :   4
        // Trap positon 2 :   5
        // (When at 'positon 2', the traps will kill next turn)
        // Monster or chest spawn 3 :  6
        // Monster or chest spawn 2 :  7
        // Monster or chest spawn 1 :  8
        // (When at 'spawn 1', the chest or monster will spawn next turn)

        //// ENTITY(1)
        // Empty :            0
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
                if (state.map.floor[i][j] == 1)
                    buffer.set(0, 0, i, j, DUNGEON);

        // chests
        state.chests.forEach(chest => {
            if (!chest.dead) buffer.set(2, 0, chest.pos.x, chest.pos.y, DUNGEON);
            else if (chest.timeBeforeSpawn <= 3) buffer.set(9 - chest.timeBeforeSpawn, 0, chest.pos.x, chest.pos.y, DUNGEON);
        });
        // Traps
        state.traps.forEach(trap => {
            buffer.set(trap.loop + 3, 0, trap.pos.x, trap.pos.y, DUNGEON);
        });
        // Spawns
        state.monsterSpawns.forEach(monsterSpawn => {
            if (monsterSpawn.monsterSpawning)
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
    displayTensor(tensor) {
        process.stdout.write("\n");
        let t = tensor.arraySync();

        for (let i = 0; i < t[0].length; i++) {
            for (let j = 0; j < t[0][i].length; j++) {
                let value = t[0][i][j][1] !== 0 ? (t[0][i][j][1] === 1 ? "P" : "M") : t[0][i][j][0];
                if (value == 0) process.stdout.write(" ");
                else if (value == 1) process.stdout.write("#");
                else if (value == 2) process.stdout.write("C");
                else process.stdout.write(value + "");
            }
            process.stdout.write("\n");
        }

    }
    movePlayer([ dx, dy ]) {
        let player = this.game.players[0];

        // Params check
        if (dx == undefined || dy == undefined) throw "dx and dy requiered";

        let choiceStatus = this.game.checkPlayerMovementChoice(player, { dx, dy });
        if (choiceStatus.badMovement) return -1;

        // Good movement
        if (this.game.allMvmtDone()) {
            this.game.nextTurn();

            if (this.game.gameOver) return -2;
        }
        return 0;
    }

    selectItem(item) {
        const availableItems = [ "", "arrow", "bomb", "dynamite" ];

        let player = this.game.player[0];

        if (item == undefined || !availableItems.includes(item))
            throw "A correct Item is requiered";

        if (player.inventory[item] == 0) // The player has no item
            return -1;

        // set item to the player
        player.selectedItem = item;
        player.nextMove = null;
    }

    getScores() {
        return this.game.getScores();
    }
}

export default Survaillant;
