/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Entity from "../Entity.js";

class Trap extends Entity {
    constructor(loopStart, name, pos) {
        super(name, pos);
        this.loop = loopStart;

        this.loopTime = 3;
        this.type = "trap";
    }
    get() {
        return {
            ...super.get(),
            loop: this.loop,
        };
    }
    nextLoop() {
        this.loop += 1;

        if (this.loop > 2) {
            this.loop = 3 - this.loopTime;
        }
        return this.loop == 2;
    }
}
export default Trap;
