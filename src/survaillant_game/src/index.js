/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const fs = require("fs");

process.on("SIGINT", () => { process.exit(); });

// Models
const Map = require("./models/games/Map.js");
const Game = require("./models/games/Game.js");

// ======== data ========
let maps = [];

// Init
loadData();

function loadData() {
    const mapFolder = __dirname + "../assets/dungeons";
    let mapFiles = fs.readdirSync(mapFolder);
    mapFiles.forEach(dugeon => {
        // Read map json file:
        let mapJson = JSON.parse(fs.readFileSync(mapFolder + "/" + dugeon + "/info.json", "utf8"));
        let map = new Map(mapJson);
        maps.push(map);
    });
}

let getMaps = () => maps;

let createGame = (map) => {
    let g = new Game(map, "solo");
    let dummyClient = { id: 0, account: null };
    g.addPayer(dummyClient, "A furtive bot");
    return g;
};

let movePlayer = (game, [ dx, dy ]) => {
    let player = game.players[0];

    // Params check
    if (dx == undefined || dy == undefined) throw "dx and dy requiered";

    let choiceStatus = game.checkPlayerMovementChoice(player, { dx, dy });
    if (choiceStatus.badMovement) return -1;

    // Good movement
    if (game.allMvmtDone()) {
        game.nextTurn();

        if (game.gameOver) return -2;
    }
    return 0;
};

let selectItem = (game, item) => {
    const availableItems = [ "", "arrow", "bomb", "dynamite" ];

    let player = game.player[0];

    if (item == undefined || !availableItems.includes(item))
        throw "A correct Item is requiered";

    if (player.inventory[item] == 0) // The player has no item
        return -1;

    // set item to the player
    player.selectedItem = item;
    player.nextMove = null;
};


module.exports = { getMaps, createGame, movePlayer, selectItem };
