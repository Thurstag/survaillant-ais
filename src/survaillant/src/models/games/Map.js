/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

class Map {
    constructor(savedMap) {
        this.name = savedMap.name;
        this.id = savedMap.id;
        this._key = savedMap._key;
        this.board = savedMap.board;
        this.floor = savedMap.floors;
        this.playerSpawn = savedMap.playerSpawn;
        this.playerSpawns = savedMap.playerSpawns;
        this.monsterSpawns = savedMap.monsterSpawns;
        this.objects = savedMap.objects;

        // 0 : void
        // 1 : Ground
        // 2 : Wall

        this.nbSpawn = savedMap.playerSpawns.length;

    }
    overview() {
        return {
            id: this.id,
            name: this.name,
            nbSpawn: this.nbSpawn,
        };
    }
    get() {
        return {
            ...this.overview(),
            board: this.board,
            floor: this.floor,
            playerSpawn: this.playerSpawn,
            playerSpawns: this.playerSpawns,
            monsterSpawns: this.monsterSpawns,
        };
    }

    isWalkable({ x, y }) {
        if (x > this.board.dimX - 1 || x < 0 || y > this.board.dimY - 1 || y < 0) {
            return false;
        }
        return this.floor[x][y] == 1;
    }
    isFlyable({ x, y }) {
        if (x > this.board.dimX - 1 || x < 0 || y > this.board.dimY - 1 || y < 0) {
            return false;
        }
        return this.floor[x][y] !== 2;
    }
}
export default Map;
