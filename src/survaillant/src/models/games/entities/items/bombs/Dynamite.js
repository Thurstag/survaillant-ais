/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Bomb from "./Bomb.js";

class Dynamite extends Bomb {
    constructor(name, pos, owner) {
        super(name, pos, owner);
        this.sousType = "dynamite";

        this.explosionTiles = [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
            { x: 0, y: -1 },
            { x: 0, y: -2 },
            { x: -1, y: 0 },
            { x: -2, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ];
    }
}
export default Dynamite;
