/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { VisitableEntity } from "./entity_visitor.js";

/**
 * Entity used to define a wall
 */
class Wall extends VisitableEntity {
    /**
     * Default constructor
     */
    constructor() {
        super(null, null);
    }

    visit(visitor) {
        return visitor.acceptWall(this);
    }
}

/**
 * Entity used to define nothing
 */
class None extends VisitableEntity {
    /**
     * Default constructor
     */
    constructor() {
        super(null, null);
    }

    visit(visitor) {
        return visitor.acceptNone(this);
    }
}

const NONE = new None();
const WALL = new Wall();

export { NONE, WALL };
