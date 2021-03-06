/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Entity from "../../Entity.js";

class Item extends Entity {
    constructor(name, pos, owner) {
        super(name, pos);
        this.owner = owner;
    }
    get() {
        return {
            ...super.get(),
        };
    }
}
export default  Item;
