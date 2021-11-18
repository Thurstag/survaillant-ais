/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

class Entity {
    constructor(name, pos) {
        this.name = name;
        this.pos = pos;

        this.type = "Entity";
        this.dead = false;

    }
    get() {
        return {
            type: this.type,
            name: this.name,
            dead: this.dead,
            pos: this.pos,
        };
    }
}
module.exports = Entity;
