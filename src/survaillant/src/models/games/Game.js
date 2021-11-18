/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

// Models :
import Player from "./entities/Player.js";
import Trap from "./entities/Trap.js";
import Chest from "./entities/Chest.js";
import Arrow from "./entities/items/arrows/Arrow.js";
import Bomb from "./entities/items/bombs/Bomb.js";
import Dynamite from "./entities/items/bombs/Dynamite.js";
import MonsterSpawn from "./entities/MonsterSpawn.js";
import Short from "./entities/monsters/Short.js";

// Services
import cs from "../../services/coordinationTools.js";

class Game {
    constructor(map, gameMode) {
        this.gameMode = gameMode; // solo, coop or versus
        this.gameOver = false;

        // Map
        this.map = map;
        this.pathFindingGrid = null;

        // Entities
        this.players = [];
        this.monsterSpawns = [];
        this.monsters = [];
        this.traps = [];
        this.chests = [];
        this.items = [];

        // difficulty managment
        this.turn = 0;
        this.nbKilledMonsters = 0;
        this.nbOpenedChests = 0;
        this.turnBeforeMonsters = 2;

        // combo
        this.combo = 0;
        this.comboScore = 0;
        this.maxCombo = 0;
        this.comboThisTurn = false;

        // other
        this.playersHits = [];
        this.monstersHits = [];

        this.setupGame();
    }

    // Gets
    get(from = undefined) {
        return {
            gameMode: this.gameMode,
            map: this.map.get(),
            ...this.getEntities(from),
            totalScore: this.calculateTotalScore()
        };
    }
    getEntities(from = undefined) {
        return {
            players: this.players.map(p => p.get(from)),
            monsterSpawns: this.monsterSpawns.map(s => s.get()),
            monsters: this.monsters.map(m => m.get()),
            traps: this.traps.map(t => t.get()),
            chests: this.chests.map(c => c.get()),
            items: this.items.map(i => i.get()),
            events: this.events.map(e => e.get()),
            score: this.calculateTotalScore(),
            combo: this.combo,
            maxCombo: this.maxCombo,
        };
    }
    getScores() {
        return {
            nbKilledMonsters: this.nbKilledMonsters,
            nbOpenedChests: this.nbOpenedChests,
            comboScore: this.comboScore,
            nbTurn: this.turn,
            totalScore: this.calculateTotalScore()
        };
    }

    get alivePlayers() {
        return this.players.filter(p => !p.dead || p.dead && p.deathThisTurn);
    }
    otherPlayerThan(player) {
        return this.alivePlayers.filter(p => p.publicId !== player.publicId);
    }
    // Setup
    setupGame() {
        if (this.map.objects.traps)
            this.map.objects.traps.forEach(trapType => {
                trapType.locations.forEach(pos => {
                    this.traps.push(new Trap(trapType.loopStart, "trap_" + this.traps.length, pos));
                });
            });

        if (this.map.objects.chests)
            this.map.objects.chests.forEach(chestPos => {
                this.chests.push(new Chest("chest", chestPos));
            });

        this.map.monsterSpawns.forEach(spawnPos => {
            this.monsterSpawns.push(new MonsterSpawn(spawnPos));
        });

        // setup pathFinding map
        this.pathFindingGrid = cs.updatePathFindingGrid(this);

    }
    addPayer(client, name = undefined, team = undefined) {
        // New player Spawn
        let pSpawn;
        if (this.gameMode === "solo" && this.map.playerSpawn !== undefined) pSpawn = this.map.playerSpawn;
        else pSpawn = this.map.playerSpawns[this.players.length];

        // New Player Team
        if (!team) team = 1;

        // Player name
        let playerName = "Player";
        if (name) playerName = name;

        // Add
        let newP = new Player(
            client,
            playerName,
            { x: pSpawn.x, y: pSpawn.y },
            team,
            ((1 + this.players.length) + "")
        );

        this.players.push(newP);
    }
    removePayer(player) {
        player.client.socket.leave(this.socketRoom);
        this.players = this.players.filter(p => p.client.id != player.client.id);

        if (this.gameMode !== "versus")
            this.gameOver = true;
    }

    // In game
    checkPlayerMovementChoice(player, { dx, dy }) {
        if (player.dead) {
            return { badMovement: true, error: "dead" };
        }

        if (!this.isReachable(dx, dy)) {
            return { badMovement: true, error: "unreachable" };
        }
        let newPos = { x: player.pos.x + dx, y: player.pos.y + dy };

        if (!this.map.isWalkable(newPos)) {
            return { badMovement: true, error: "unwalkable" };
        }

        // Bomb
        if (this.items.filter(i => i.type == "bomb").find(b => cs.sameTile(b.pos, newPos)))
            return { badMovement: true, error: "Boom in the way" };


        if (player.selectedItem !== "" && !this.isItemDropable(newPos)) {
            return { badMovement: true, error: "cant land Item" };
        }

        // mvmt ok
        player.nextMove = newPos;

        return { badMovement: false };
    }
    isPath({ x, y }) {
        if (!this.map.isWalkable({ x, y })) return false;
        // Entities
        if ([ ...this.monsters, ...this.chests, ...this.items.filter(i => i.type == "bomb") ]
            .find(e => !e.dead && cs.sameTile(e.pos, { x, y }))) return false;

        return true;
    }

    isReachable(dx, dy) {
        return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && dx !== dy;
    }
    isItemDropable({ x, y }) {
        return [ ...this.players, ...this.monsters, ...this.chests.filter(c => !c.dead) ].find(e => cs.sameTile(e.pos, { x, y })) == undefined;
    }
    allMvmtDone() {
        return this.players.find(p => !p.dead && p.nextMove == null) == undefined;
    }


    // Turn
    nextTurn() {

        this.turn += 1;
        this.events = [];
        this.monstersHits = [];
        this.playersHits = [];

        // Do the actions
        this.calculatePlayersNextPos();
        this.movePlayers();
        this.moveMonsters();
        this.moveObjects();
        this.spawnMonsters();
        this.applyMonstersAttack(); // To make monsters dies if they are hit by arrows or bomb (last chance for player)
        this.applyPlayersAttack(); // idem

        // death entity explosion
        this.monsters = this.monsters.filter(m => !m.dead);
        this.items = this.items.filter(i => !i.dead);
        this.gameOver = this.isGameOver();

        if (!this.gameOver) {
            // update PathFindingGrid
            this.pathFindingGrid = cs.updatePathFindingGrid(this);

            // Calculate Combo
            this.calculateComboPoints();
        }
    }
    calculatePlayersNextPos() {
        // direction
        this.alivePlayers.forEach(p => {
            if (p.pos.x < p.nextMove.x) { p.heading = "right"; p.direction = "right"; }
            if (p.pos.x > p.nextMove.x) { p.heading = "left"; p.direction = "left"; }
            if (p.pos.y < p.nextMove.y) { p.heading = "down"; }
            if (p.pos.y > p.nextMove.y) { p.heading = "up"; }
        });

        // Item placement
        this.alivePlayers.forEach(p => {
            if (p.selectedItem == "arrow")
                this.items.push(new Arrow("arrow", p.pos, p, p.heading));

            let frontPos = cs.nextTile(p.pos, p.heading);
            if (p.selectedItem == "bomb")
                this.items.push(new Bomb("bomb", frontPos, p));

            if (p.selectedItem == "dynamite")
                this.items.push(new Dynamite("dynamite", frontPos, p));

            if (p.selectedItem == "dynamite" || p.selectedItem == "bomb")
                this.pathFindingGrid.setWalkableAt(frontPos.x, frontPos.y, false);

            if (p.selectedItem == "dynamite" || p.selectedItem == "bomb" || p.selectedItem == "arrow")
                this.comboThisTurn = true; // do not stop the game combo
        });

        // objects collision
        this.alivePlayers.forEach(p => {
            if (p.selectedItem || this.objectCollision(p)) {
                p.objectCollision = true;
                p.nextPos = p.pos;
            }
        });

        // players collision
        this.alivePlayers.forEach(p => {
            if (!p.objectCollision) {
                if (!this.playerCollision(p)) {
                    // The player move
                    p.nextPos = p.nextMove;
                }
                else {
                    // The player stay where he is
                    p.nextPos = p.pos;
                    p.playerCollision = true;
                }
            }
        });
    }

    objectCollision(p) {
        // chest opening
        let openedChest = this.chests.find(c => !c.dead && cs.sameTile(c.pos, p.nextMove));
        if (openedChest) {
            openedChest.setOpen();
            this.nbOpenedChests += 1;
            this.addCombo();
            this.pathFindingGrid.setWalkableAt(openedChest.pos.x, openedChest.pos.y, true);

            // loot
            if (Math.random() >= 0.5) {
                if (Math.random() >= 0.5) { p.inventory.arrow += 1; }
                else {
                    if (Math.random() >= 0.5) { p.inventory.bomb += 1; }
                    else { p.inventory.dynamite += 1; }
                }
            }
            return true;

        }
        // monster killing
        let targetedMonster = this.monsters.find(m => !m.dead && cs.sameTile(m.pos, p.nextMove));
        if (targetedMonster) {
            targetedMonster.hit();

            // slash
            if (targetedMonster.dead) {
                this.pathFindingGrid.setWalkableAt(targetedMonster.pos.x, targetedMonster.pos.y, true);
                this.nbKilledMonsters += 1;
                this.addCombo();
            }
            return true;
        }
    }
    playerCollision(p, from = undefined) {
        if (p.objectCollision) return true;
        if (p.playerCollision) return true;

        let target = this.otherPlayerThan(p).find(op => cs.sameTile(p.nextMove, op.pos));

        if (target) {
            // is the target targeting us ?
            if (cs.sameTile(target.nextMove, p.pos)) {
                // Face bumpc
                return true;
            }

            // is it a dead lock ?
            if (from && from.publicId === target.publicId) return false;

            // is the target able to move ?
            if (this.playerCollision(target, (from ? from : p))) {
                // no = hit
                this.playersHits.push({
                    player: p,
                    target
                });
                return true;
            }
        }

        let tileBumpPlayer = this.otherPlayerThan(p).find(op => cs.sameTile(p.nextMove, op.nextMove));
        if (tileBumpPlayer) return true;

        //   // Advanced Movement
        //   if (this.gameMode == "versus") {
        //     // backHit
        //     if (cs.sameTile(p.nextMove, op.pos) && cs.sameTile(op.nextMove, cs.nextTile(p.nextMove, p.heading))) {
        //       op.dead = true
        //       return true
        //     }
        //     // dashHit
        //     if (cs.perpandicularHeading(p.heading, op.heading) && cs.sameTile(op.nextMove, cs.nextTile(p.nextMove, p.heading))) {
        //       op.dead = true
        //       return false
        //     }
        //   }
        // }
    }
    movePlayers() {
        this.alivePlayers.forEach(p => {
            p.pos = p.nextPos;
            p.nextMove = null;
            p.nextPos = null;
            p.objectCollision = false;
            p.playerCollision = false;

            if (p.selectedItem) {
                p.inventory[p.selectedItem] -= 1;
                p.selectedItem = "";
            }
        });
    }
    moveMonsters() {
        // find movement
        this.monsters.filter(m => !m.dead).forEach(m => {
            m.findnextMove(this);
        });

        // Apply movement
        this.monsters.filter(m => !m.dead && m.nextMove !== null).forEach(m => {
            // directions
            if (m.pos.x < m.nextMove.x) { m.heading = "right"; m.direction = "right"; }
            if (m.pos.x > m.nextMove.x) { m.heading = "left"; m.direction = "left"; }
            if (m.pos.y < m.nextMove.y) { m.heading = "down"; }
            if (m.pos.y > m.nextMove.y) { m.heading = "up"; }

            // Kill player
            let killedPlayer = this.alivePlayers.find(p => cs.sameTile(p.pos, m.nextMove));
            if (killedPlayer) {
                // store hit to see if arrow kill him before
                this.monstersHits.push({
                    monster: m,
                    player: killedPlayer
                });
            } else {
                m.pos = m.nextMove;
            }

            m.nextMove = null;
        });
    }

    moveObjects() {
        // Bombs
        this.items.filter(i => i.type == "bomb").forEach(b => { if (b.nextLoop()) this.explodeBomb(b); });

        // Arrows
        this.items.filter(i => i.type == "arrow").forEach(a => {
            // kill Facing
            let eSucid = [ ...this.players, ...this.monsters ]
                .find(e => cs.sameTile(e.pos, a.pos) && cs.facing(e.heading, a.heading));

            if (eSucid) {
                // Kill arrow and monster
                eSucid.dead = true;
                a.dead = true;
                if (eSucid.type == "monster") {
                    this.nbKilledMonsters += 1;
                    if (a.owner) this.addCombo();
                }
                return;
            }

            a.pos = cs.nextTile(a.pos, a.heading);

            // Wall
            if (!this.map.isFlyable(a.pos)) {
                a.dead = true;
            }

            // kill by arrow touching
            let eDead = [ ...this.players, ...this.monsters, ...this.items.filter(i2 => i2 !== a) ]
                .find(e => cs.sameTile(e.pos, a.pos));
            if (eDead) {
                a.dead = true;
                if (eDead.type == "bomb") this.explodeBomb(eDead);
                else eDead.dead = true;
                if (eDead.type == "monster") {
                    this.nbKilledMonsters += 1;
                    if (a.owner) this.addCombo();
                }
                return;
            }
        });

        // traps
        this.traps.forEach(t => {
            if (t.nextLoop()) {
                // trap activation
                [ ...this.players, ...this.monsters ].filter(e => cs.sameTile(e.pos, t.pos))
                    .forEach(e => { e.dead = true; });
            }
        });

        // chests
        this.chests.forEach(c => {
            if (c.dead && c.nextLoop() == 0) {
                // kill player over chest spawn
                [ ...this.players, ...this.monsters ].filter(e => cs.sameTile(e.pos, c.pos))
                    .forEach(e => { e.dead = true; });
            }
        });

        // monsters spawns
        this.monsterSpawns.forEach(s => {
            if (s.nextLoop()) {
                // kill entity over monster spawn
                [ ...this.players, ...this.monsters ].filter(e => cs.sameTile(e.pos, s.pos))
                    .forEach(e => { e.dead = true; });

                // add monster
                this.monsters.push(s.spawningMonster);
            }
        });

    }
    explodeBomb(b) {
        b.dead = true;
        this.pathFindingGrid.setWalkableAt(b.pos.x, b.pos.y, true);
        b.getExplosionZone().forEach(t => {
            let ded = [ ...this.players, ...this.monsters, ...this.items ].find(e => cs.sameTile(e.pos, t));
            if (ded) {
                if (ded.type == "monster" && !ded.dead) {
                    this.nbKilledMonsters += 1;
                    // add combo to player
                    this.addCombo();
                }
                if (ded.type == "bomb" && !ded.dead) this.explodeBomb(ded);
                else ded.dead = true;
            }
        });
    }

    applyPlayersAttack() {
        this.playersHits.filter(playerHit => !playerHit.player.dead).forEach(playerHit => {
            playerHit.target.dead = true;
        });
    }
    applyMonstersAttack() {
        this.monstersHits.filter(monsterHit => !monsterHit.monster.dead).forEach(monsterHit => {
            monsterHit.player.dead = true;
        });
    }
    spawnMonsters() {
        if (this.turn > this.turnBeforeMonsters) {
            let freeSpawns = this.monsterSpawns.filter(s => !s.monsterSpawning).filter(s => ![ ...this.monsters, ...this.players ].find(e => cs.sameTile(e.pos, s.pos)));
            // not spawning & nobody on

            if (freeSpawns.length > 0) {

                // let avgMonstersToSpawn = Math.floor((this.turn - this.turnBeforeMonsters) / 3)
                // let nbMonstersToSpawn = Math.abs(cs.randomInRange(0, avgMonstersToSpawn))

                let avgMonstersToSpawn = Math.ceil(this.turn / 20);
                let nbMonstersToSpawn = Math.abs(cs.randomInRange(0, avgMonstersToSpawn));

                freeSpawns = cs.shuffle(freeSpawns);
                for (let i = 0; (i < nbMonstersToSpawn && i < freeSpawns.length); i++) {
                    freeSpawns[i].spawnMonster(new Short(freeSpawns[i].pos));
                }

            }
        }
    }

    // Other
    addCombo() {
        this.combo += 1;
        this.maxCombo = Math.max(this.combo, this.maxCombo);
        this.comboThisTurn = true;
    }
    updatePathFinding() {
        this.pathFindingGrid = cs.updatePathFindingGrid(this);
    }
    isGameOver() {
        if (this.gameMode == "versus") {
            let teams = Array.from(new Set(this.players.map(p => p.team)));
            let nbTeamleft = 0;
            let lastTeam;
            teams.forEach(t => {
                let allDead = this.players.filter(p => p.team == t).find(p => !p.dead) == undefined;
                if (!allDead) {
                    nbTeamleft += 1;
                    lastTeam = t;
                }
            });

            if (nbTeamleft == 1) {
                // we have a winner
                this.players.filter(p => p.team == lastTeam)
                    .forEach(p => {
                        if (p.client.account) {
                            p.client.account.versusWin += 1;
                        }
                    });

            }
            return (nbTeamleft <= 1);

        } else {
            return this.players.some(p => p.dead);
        }
    }
    calculateTotalScore() {
        return this.turn + this.nbKilledMonsters + this.nbOpenedChests + this.comboScore;
    }
    calculateComboPoints() {
        if (!this.comboThisTurn) {
            // add the combo points
            let bonusPoints = 0;
            for (let i = 3; i <= this.combo; i++) bonusPoints += i - 1;

            this.comboScore += bonusPoints;
            this.combo = 0;
        }

        // Reset Combo
        this.comboThisTurn = false;
    }

}
export default Game;
