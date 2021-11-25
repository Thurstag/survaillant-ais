/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import fs from "fs";
import Game from "./models/games/Game.js";
import Map from "./models/games/Map.js";

process.on("SIGINT", () => {
    process.exit();
});

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
    // TODO: Doc
    constructor(map) {
        this.game = new Game(map, "solo");
        let dummyClient = { id: 0, account: null };
        this.game.addPayer(dummyClient, "A furtive bot");
    }

    // TODO: Doc
    getState() {
        return this.game.get();
    }

    // TODO: Doc
    forEach(onChest, onMonster, onTrap, onMonsterSpawn) {
        let state = this.game.get();

        state.monsters.forEach(monster => onMonster(monster.pos.x, monster.pos.y));
        state.chests.forEach(onChest);
        state.traps.forEach(onTrap);
        state.monsterSpawns.forEach(onMonsterSpawn);
    }

    // TODO: Doc
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

    // TODO: Doc
    movePlayer(dx, dy) {
        let player = this.game.players[0];

        // Params check
        if (dx === undefined || dy === undefined) throw "dx and dy requiered";

        let choiceStatus = this.game.checkPlayerMovementChoice(player, { dx, dy });
        if (choiceStatus.badMovement) return Survaillant.ActionConsequence.BAD_MOVEMENT;

        // Good movement
        if (this.game.allMvmtDone()) {
            this.game.nextTurn();

            if (this.game.gameOver) return Survaillant.ActionConsequence.GAME_OVER;
        }
        return Survaillant.ActionConsequence.MOVED;
    }

    // TODO: Doc
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

    // TODO: Doc
    getScores() {
        return this.game.getScores();
    }
}

export default Survaillant;
