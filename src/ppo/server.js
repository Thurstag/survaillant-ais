import express from "express";
import Survaillant from "../survaillant/src/index.js";

const app = express();

app.listen(3000);

let game = Survaillant.createGame(Survaillant.getMaps()[0]);

app.get("/createNewGame/:mapNumber", (req, res) => {
    const mapNumber = parseInt(req.params.mapNumber);
    game = Survaillant.createGame(Survaillant.getMaps()[mapNumber]);
    res.sendStatus(200);
});

app.get("/getGameSate/fullMap", (req, res) => {
    res.send(game.getStateAsTensor(parseInt(req.query.x), parseInt(req.query.y)).arraySync());
});

app.get("/movePlayer", (req, res) => {
    res.send({ resp: game.movePlayer(parseInt(req.query.x), parseInt(req.query.y)) });
});

app.get("/getScores", (req, res) => {
    res.send(game.getScores());
});



