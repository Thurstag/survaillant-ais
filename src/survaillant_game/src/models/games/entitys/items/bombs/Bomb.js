/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const Item = require("../Item");

class Bomb extends Item {
  constructor(name, pos, owner) {
    super(name, pos, owner)

    this.animationLoop = 0
    this.timeBeforeBoom = 4
    this.type = "bomb"
    this.sousType = "bomb"

    this.explosionTiles = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ]
  }
  get() {
    return {
      ...super.get(),
      sousType: this.sousType,
      explosionTiles: this.explosionTiles,
      timeBeforeBoom: this.timeBeforeBoom,
      animationLoop: this.animationLoop,
    }
  }
  nextLoop() {
    this.timeBeforeBoom -= 1
    return this.timeBeforeBoom == 0
  }
  getExplosionZone() {
    return this.explosionTiles.map(t => { return { x: t.x + this.pos.x, y: t.y + this.pos.y } })
  }
}
module.exports = Bomb;
