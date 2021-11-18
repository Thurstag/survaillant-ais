/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const Entity = require("../../Entity");

class Item extends Entity {
  constructor(name, pos, owner) {
    super(name, pos)
    this.owner = owner
  }
  get() {
    return {
      ...super.get(),
    }
  }
}
module.exports = Item;
