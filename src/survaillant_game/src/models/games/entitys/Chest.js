/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const Entity = require("../Entity");

class Chest extends Entity {
  constructor(name, pos) {
    super(name, pos)
    this.dead = false

    this.type = "chest"
    this.spawnTime = 6;
    this.timeBeforeSpawn = 0;
  }
  get() {
    return {
      ...super.get(),
      spawnTime: this.spawnTime,
      timeBeforeSpawn: this.timeBeforeSpawn,
    }
  }
  setOpen() {
    this.dead = true
    this.timeBeforeSpawn = this.spawnTime
  }
  nextLoop() {
    if (this.dead) {
      this.timeBeforeSpawn -= 1
      if (this.timeBeforeSpawn == 0) this.dead = false
    }
    return this.timeBeforeSpawn
  }
}
module.exports = Chest;
