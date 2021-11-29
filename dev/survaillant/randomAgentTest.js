// Import the game functions
import Survaillant from "../../src/survaillant/src/index.js";
import * as fs from "fs";

// Getting the loaded maps info
let maps = Survaillant.getMaps();
const DIRECTION = [[-1, 0], [1, 0], [0, -1], [0, 1]];

let stats = {}

// dataToExport : List of games played by the model
// [
//   [
//      mapName,
//      score,
//      nbTurn,
//      nbKilled,
//      nbChests,
//      comboScore,
//      gameOverReason ("GAME_OVER" or "BAD_MOVEMENT")
//   ]
// ]
//
// CSV to export:
// mapName, score, nbTurn, nbKilled, nbChests, comboScore, gameOverReason ("GAME_OVER" or "BAD_MOVEMENT")
// A potato, 45, 34, 8, 3, 0, GAME_OVER
// Small danger noodle, 1, 1, 0, 0, 0 BAD_MOVEMENT
// Private Room, 25, 23, 1, 1, 0, GAME_OVER
// The area, 4, 3, 0, 1, 0,   BAD_MOVEMENT
// The cube, 28, 26, 2, 0, 0, GAME_OVER

let dataToExport = [];

function exportArrayToCSV(filename, twoDiArray) {
    let csvRows = twoDiArray.map(row => row.join(","));
    let csvString = csvRows.join('\r\n');

    // Save the CSV file
    fs.writeFile(filename, csvString, function (err) {
        if (err) console.log(err);
        else console.log("Successful CSV Export");
    })
}

maps.forEach(map => {
    // stats[map.name] = []
    let scores = []

    // Move the player
    // Left :  [-1, 0]
    // Right : [1,  0]
    // Top :   [0, -1]
    // Bot :   [0,  1]

    // Play 100 games
    for (let i = 0; i < 1000; i++) {
        let game = Survaillant.createGame(map);
        console.log(`Game ${i}`);
        let gameOver = false;
        let result
        while (!gameOver) {
            let direction = DIRECTION[Math.floor(Math.random() * DIRECTION.length)];
            result = game.movePlayer(direction[0], direction[1]);
            if (result === "GAME_OVER") gameOver = true;
            if (result === "BAD_MOVEMENT") gameOver = true;

            // game.getStateMatrix({ w: 13, h: 13 })
            // console.log(game.getScores().totalScore);
        }
        let score = game.getScores();
        scores.push(score);

        // game.getScores() :
        //  nbKilledMonsters
        //  nbOpenedChests
        //  comboScore
        //  nbTurn
        //  totalScore

        dataToExport.push([
            map.name,
            score.totalScore,
            score.nbTurn,
            score.nbKilledMonsters,
            score.nbOpenedChests,
            score.comboScore,
            result
        ]);
    }
    // Average score
    stats[map.name] = {}
    stats[map.name].nbKilled = scores.reduce((a, b) => a + b.nbKilledMonsters, 0) / scores.length
    stats[map.name].nbChests = scores.reduce((a, b) => a + b.nbOpenedChests, 0) / scores.length
    stats[map.name].comboScore = scores.reduce((a, b) => a + b.comboScore, 0) / scores.length
    stats[map.name].nbTurn = scores.reduce((a, b) => a + b.nbTurn, 0) / scores.length
    stats[map.name].total = scores.reduce((a, b) => a + b.totalScore, 0) / scores.length
})

exportArrayToCSV("random.csv", dataToExport);
console.log(stats);