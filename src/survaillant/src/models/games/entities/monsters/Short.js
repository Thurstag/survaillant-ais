/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Monster from "../Monster.js";

// Services
import cs from "../../../../services/coordinationTools.js";

class Short extends Monster {
    constructor(pos) {
        super("Short", pos);
        this.avatar = "Short";
    }
    get() {
        return {
            ...super.get(),
        };
    }

    findnextMove(game) {
    // find closest player
        let target = cs.closestEntity(this, game.players);

        // find available tile
        let direction = cs.betterDirection(game, this, target);
        if (direction) {
            this.nextMove = { x: direction[0], y: direction[1] };
            game.pathFindingGrid.setWalkableAt(this.pos.x, this.pos.y, true);
            game.pathFindingGrid.setWalkableAt(this.nextMove.x, this.nextMove.y, false);
        }

    }
}
export default Short;
