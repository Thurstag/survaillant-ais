import express from "express";
import Survaillant from "../survaillant/src/index.js";
import { flashlight } from "../common/states.js";

const app = express();
const port = 4000;
app.listen(port, ()=>{
    console.log("listening on port", port);
});

let game = Survaillant.createGame(Survaillant.getMaps()[0]);

app.get("/createNewGame/:mapNumber", (req, res) => {
    const mapNumber = parseInt(req.params.mapNumber);
    game = Survaillant.createGame(Survaillant.getMaps()[mapNumber]);
    res.sendStatus(200);
});

app.get("/getGameSate/fullMap", (req, res) => {
    res.send(game.getStateAsTensor(parseInt(req.query.x), parseInt(req.query.y)).arraySync());
});

app.get("/getGameSate/flashLight", (req, res) => {
    res.send(flashlight(game, parseInt(req.query.radius)).arraySync());
});

app.get("/movePlayer", (req, res) => {
    res.send({ resp: game.movePlayer(parseInt(req.query.x), parseInt(req.query.y)) });
});

app.get("/getScores", (req, res) => {
    res.send(game.getScores());
});
