import * as tf from "@tensorflow/tfjs-node";
import * as fs from "fs";
import Survaillant from "../../survaillant/src/index.js";
import { flashlight } from "../../common/states.js";

const PATH_TO_MODEL = "file://modelsweight_ppo6/save350/model.json";
const CSV_EXPORT_NAME = "PPO_all_flashlight3_4_350.csv";
const NB_GAMES = 1000;
const RADIUS = 3;
let maps = Survaillant.getMaps();

const DIRECTIONS = [ [ 0, 1 ], [ 0, -1 ], [ 1, 0 ], [ -1, 0 ] ];
let stats = {};

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

let dataToExport = [ [ "mapName", "score", "nbTurn", "nbKilled", "nbChests", "comboScore", "gameOverReason" ] ];

function exportArrayToCSV(filename, twoDiArray) {
    let csvRows = twoDiArray.map(row => row.join(","));
    let csvString = csvRows.join("\r\n");

    // Save the CSV file
    fs.writeFile(filename, csvString, function (err) {
        if (err) console.log(err);
        else console.log("Successful CSV Export");
    });
}

function testOnMap(map, model) {
    // Create new game
    console.log(`Map ${map.name}`);

    let scores = [];
    for (let i = 0; i < NB_GAMES; i++) {
        if (map.name == "The area") i += 100;
        console.log(`game ${i}`);
        let game = Survaillant.createGame(map);
        let gameOver = false;
        let result;
        let turn = 0;

        while (!gameOver && turn < 1000) {
            // Get the state of the game as a tensor
            let state = flashlight(game, RADIUS);
            const prediction = model.predict(tf.expandDims(state.reshape([ 245 ])));

            const action = prediction.argMax(1).dataSync()[0];
            result = game.movePlayer(DIRECTIONS[action][0], DIRECTIONS[action][1]);
            if (result === "GAME_OVER") gameOver = true;
            if (result === "BAD_MOVEMENT") {
                gameOver = true;
            }
            turn += 1;
        }
        let score = game.getScores();
        scores.push(score);
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
    stats[map.name] = {};
    stats[map.name].nbKilled = scores.reduce((a, b) => a + b.nbKilledMonsters, 0) / scores.length;
    stats[map.name].nbChests = scores.reduce((a, b) => a + b.nbOpenedChests, 0) / scores.length;
    stats[map.name].comboScore = scores.reduce((a, b) => a + b.comboScore, 0) / scores.length;
    stats[map.name].nbTurn = scores.reduce((a, b) => a + b.nbTurn, 0) / scores.length;
    stats[map.name].total = scores.reduce((a, b) => a + b.totalScore, 0) / scores.length;
    stats[map.name].best = scores.reduce((a, b) => Math.max(a, b.totalScore), 0);
}

tf.loadLayersModel(PATH_TO_MODEL).then(model => {
    maps.forEach(map => {
        testOnMap(map, model);
    });
    exportArrayToCSV(CSV_EXPORT_NAME, dataToExport);
});


