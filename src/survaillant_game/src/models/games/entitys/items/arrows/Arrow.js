/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const Item = require("../Item");

class Arrow extends Item {
  constructor(name, pos, owner, heading) {
    super(name, pos, owner)

    this.heading = heading

    this.dead = false
    this.animationLoop = 0
    this.type = "arrow"
  }
  get() {
    return {
      ...super.get(),
      heading: this.heading,
      animationLoop: this.animationLoop,
    }
  }
  nextLoop() {
  }
}
module.exports = Arrow;
