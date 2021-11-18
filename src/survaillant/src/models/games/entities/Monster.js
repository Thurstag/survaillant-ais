/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Entity from "../Entity.js";

class Monster extends Entity {
    constructor(name, pos) {
        super(name, pos);
        this.nextMove = null;

        this.type = "monster";
        this.direction = "right";
        this.heading = "right";
        this.avatar = null;
        this.animationLoop = 0;
        this.hitPoint = 1;
    }
    get() {
        return {
            ...super.get(),
            direction: this.direction,
            avatar: this.avatar,
            animationLoop: this.animationLoop,
        };
    }
    hit() {
        this.hitPoint -= 1;
        if (this.hitPoint == 0) {
            this.dead = true;
        }
    }
}
export default Monster;
