// Import the game functions
let Survaillant = require("../../src/survaillant_game/src/index.js");

// Getting the loaded maps
let maps = Survaillant.getMaps();
console.log(maps.length + " maps");
let map = maps[0];

// Creating a new game
let game = Survaillant.createGame(map);
// Game :
//     players : []
//     monsterSpawns : []
//     monsters : []
//     traps : []
//     chests : []
//     items : []


// Move the player
// Left :  [-1, 0]
// Right : [1,  0]
// Top :   [0, -1]
// Bot :   [0,  1]
const DIRECTION = [ [ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ 0, 1 ] ];
for (let i = 0; i < 100; i++) {
    let direction = DIRECTION[Math.floor(Math.random() * DIRECTION.length)];
    let result = game.movePlayer(direction);
    if (result === -1) console.log("Bot moved into a wall !");

    else if (result === -2) {
        console.log("Game over !");
        console.log("score : " + game.getScores().totalScore);
        console.log("Killed : " + game.getScores().nbKilledMonsters);
        break;
    }
    console.log("movement OK");

    // game.getScores() :
    //  nbKilledMonsters
    //  nbOpenedChests
    //  comboScore
    //  nbTurn
    //  totalScore
}

// reset game
game = Survaillant.createGame(map);
