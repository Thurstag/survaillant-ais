/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { Visitable } from "../../../../../common/game/environment/state/entity_visitor.js";

class MonsterSpawn extends Visitable {
    constructor(pos) {
        super();
        this.pos = pos;

        this.spawnTime = 3;
        this.timeBeforeSpawn = 0;
        this.monsterSpawning = false;

        this.spawningMonster = null;
    }
    get() {
        return {
            pos: this.pos,
            spawnTime: this.spawnTime,
            monsterSpawning: this.monsterSpawning,
            timeBeforeSpawn: this.timeBeforeSpawn,
            spawningMonster: this.spawningMonster
        };
    }
    spawnMonster(m) {
        this.monsterSpawning = true;
        this.spawningMonster = m;
        this.timeBeforeSpawn = this.spawnTime;
    }
    nextLoop() {
        if (this.monsterSpawning) {
            this.timeBeforeSpawn -= 1;

            if (this.timeBeforeSpawn == 0) {
                this.monsterSpawning = false;
                return true;
            }
        }
        return false;
    }

    visit(visitor) {
        return visitor.acceptMonsterSpawn(this);
    }
}
export default MonsterSpawn;
