// Import the game functions
import Survaillant from "../../src/survaillant/src/index.js";

// Getting the loaded maps info
let maps = Survaillant.getMaps();
const DIRECTION = [[-1, 0], [1, 0], [0, -1], [0, 1]];

let stats = {}
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
        while (!gameOver) {
            let direction = DIRECTION[Math.floor(Math.random() * DIRECTION.length)];
            let result = game.movePlayer(direction);
            if (result === -2) gameOver = true;

            game.getStateMatrix({ w: 13, h: 13 })
            // console.log(game.getScores().totalScore);
        }
        scores.push(game.getScores());

        // game.getScores() :
        //  nbKilledMonsters
        //  nbOpenedChests
        //  comboScore
        //  nbTurn
        //  totalScore
    }
    // Average score
    stats[map.name] = {}
    stats[map.name].nbKilled = scores.reduce((a, b) => a + b.nbKilledMonsters, 0) / scores.length
    stats[map.name].nbChests = scores.reduce((a, b) => a + b.nbOpenedChests, 0) / scores.length
    stats[map.name].comboScore = scores.reduce((a, b) => a + b.comboScore, 0) / scores.length
    stats[map.name].nbTurn = scores.reduce((a, b) => a + b.nbTurn, 0) / scores.length
    stats[map.name].total = scores.reduce((a, b) => a + b.totalScore, 0) / scores.length
})


console.log(stats);