/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const PF = require("pathfinding")

const finder = new PF.BiAStarFinder();
// pathFinding
function updatePathFindingGrid(game) {
  let dimX = game.map.board.dimX
  let dimY = game.map.board.dimY
  let grid = new PF.Grid(dimX, dimY);

  for (let i = 0; i < dimX; i++) {
    for (let j = 0; j < dimY; j++) {
      grid.setWalkableAt(i, j, game.isPath({ x: i, y: j }));
    }
  }

  return grid
}

// Other
function sameTile(a, b) {
  return a.x == b.x && a.y == b.y
}
function nextTile(pos, heading) {
  if (heading == "left") {
    return { x: pos.x - 1, y: pos.y }
  } else if (heading == "right") {
    return { x: pos.x + 1, y: pos.y }
  } else if (heading == "up") {
    return { x: pos.x, y: pos.y - 1 }
  } else if (heading == "down") {
    return { x: pos.x, y: pos.y + 1 }
  }
}
function perpandicularHeading(h1, h2) {
  if ((h1 == "up" || h1 == "down") && (h2 == "left" || h2 == "right")) return true
  if ((h2 == "up" || h2 == "down") && (h1 == "left" || h1 == "right")) return true
  return false
}
function facing(h1, h2) {
  if ((h1 == "up" && h2 == "down") || (h1 == "down" && h2 == "up")
    || (h1 == "left" && h2 == "right") || (h1 == "right" && h2 == "left")) return true
  return false
}
function getSlashAnimation(a, b) {
  let slashDirection = "slashRight"
  if (a.x < b.x) {
    slashDirection = "slashLeft"
  } else if (b.y < a.y) {
    slashDirection = "slashDown"
  } else if (b.y > a.y) {
    slashDirection = "slashUp"
  }
  return { slashDirection, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}
function randomInRange(start, end) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function closestEntity(entity, targets) {
  let closestTarget = null
  let closestDistance = null

  targets.forEach(t => {
    let distance = dist(entity.pos, t.pos)

    if (closestDistance == null || closestDistance > distance) {
      closestDistance = distance
      closestTarget = t
    }
  });

  return closestTarget
}

function betterDirection(game, entity, target) {
  var path = finder.findPath(
    entity.pos.x,
    entity.pos.y,
    target.pos.x,
    target.pos.y,
    game.pathFindingGrid.clone());

  if (path.length > 1) {
    return path[1]
  }
  return false
}

const cs = { updatePathFindingGrid, sameTile, nextTile, perpandicularHeading, facing, getSlashAnimation, dist, randomInRange, shuffle, closestEntity, betterDirection }
exports.default = cs