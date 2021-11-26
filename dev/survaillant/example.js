/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

// Import the game functions
import Survaillant from "../../src/survaillant/src/index.js";

// Getting the loaded maps info
let maps = Survaillant.getMaps();
// Maps:
//   1 A potato
//    dimX: 11, dimY: 7
//    monsterSpawns : 4
//    traps : 8
//    chests : 2
//   2 Small danger noodle
//    dimX: 11, dimY: 11
//    monsterSpawns : 6
//    traps : 9
//    chests : 2
//   3 Private Room
//    dimX: 10, dimY: 8
//    monsterSpawns : 8
//    traps : 8
//    chests : 4
//   4 The area
//    dimX: 17, dimY: 17
//    monsterSpawns : 8
//    traps : 32
//    chests : 8
//   5 The cube
//    dimX: 9, dimY: 9
//    monsterSpawns : 6
//    traps : 16
//    chests : 0

let map = maps[0];
// map.name;
// map.id;
// map._key;
// map.board;
// map.floor;
//    0 : void
//    1 : Ground
//    2 : Wall
// map.playerSpawn;
// map.playerSpawns;
// map.monsterSpawns;
// map.objects;

// Creating a new game
let game = Survaillant.createGame(map);
// Game.getState() :
//     players : []
//     monsterSpawns : []
//     monsters : []
//     traps : []
//     chests : []
//     items : []
//  A complete example is available in this file folder

// Move the player
// Left :  [-1, 0]
// Right : [1,  0]
// Top :   [0, -1]
// Bot :   [0,  1]

console.log("Starting the game");

// let state = game.getStateMatrix({w: 13, h:13})
game.getStateAsTensor( 13, 13 );

const DIRECTION = [[-1, 0], [1, 0], [0, -1], [0, 1]];
for (let i = 0; i < 100; i++) {
    let direction = DIRECTION[Math.floor(Math.random() * DIRECTION.length)];

    let result = game.movePlayer(direction[0], direction[1]);

    if (result === -1) console.log("Bot moved into a wall !");

    else if (result === -2) {
        console.log("Game over !");
        break;
    }
    game.getStateAsTensor( 13, 13 );

    console.log("movement OK");
}

console.log("score : " + game.stats.score);
console.log("Killed : " + game.stats.killedMonsters);

// reset game
game = Survaillant.createGame(map);
