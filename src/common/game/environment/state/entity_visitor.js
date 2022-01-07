/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import Entity from "../../../../survaillant/src/models/games/Entity.js";

/**
 * Visitor of {@link Visitable} and {@link VisitableEntity}
 */
class EntityVisitor {
    /**
     * Callback called when none entity is encountered
     *
     * @param {None} none None
     * @return {*} Object
     */
    acceptNone(none) { // eslint-disable-line no-unused-vars
        throw new Error("acceptNone isn't implemented");
    }

    /**
     * Callback called when wall entity is encountered
     *
     * @param {Wall} wall Wall
     * @return {*} Object
     */
    acceptWall(wall) { // eslint-disable-line no-unused-vars
        throw new Error("acceptWall isn't implemented");
    }

    /**
     * Callback called when player entity is encountered
     *
     * @param {Player} player Player
     * @return {*} Object
     */
    acceptPlayer(player) { // eslint-disable-line no-unused-vars
        throw new Error("acceptPlayer isn't implemented");
    }

    /**
     * Callback called when chest entity is encountered
     *
     * @param {Chest} chest Chest
     * @return {*} Object
     */
    acceptChest(chest) { // eslint-disable-line no-unused-vars
        throw new Error("acceptChest isn't implemented");
    }

    /**
     * Callback called when monster entity is encountered
     *
     * @param {Monster} monster Monster
     * @return {*} Object
     */
    acceptMonster(monster) { // eslint-disable-line no-unused-vars
        throw new Error("acceptMonster isn't implemented");
    }

    /**
     * Callback called when trap entity is encountered
     *
     * @param {Trap} trap Trap
     * @return {*} Object
     */
    acceptTrap(trap) { // eslint-disable-line no-unused-vars
        throw new Error("acceptTrap isn't implemented");
    }

    /**
     * Callback called when monster spawn entity is encountered
     *
     * @param {MonsterSpawn} spawn Monster spawn
     * @return {*} Object
     */
    acceptMonsterSpawn(spawn) { // eslint-disable-line no-unused-vars
        throw new Error("acceptMonsterSpawn isn't implemented");
    }
}

/**
 * Object that is visitable by a {@link EntityVisitor}
 */
class Visitable {
    /**
     * Call the suitable callback of the given visitor for this instance
     *
     * @param {EntityVisitor} visitor Visitor
     * @return {*} Object returned by the callback
     */
    visit(visitor) { // eslint-disable-line no-unused-vars
        throw new Error("visit isn't implemented");
    }
}

/**
 * Entity that is visitable
 */
class VisitableEntity extends Entity {
    /**
     * Call the suitable callback of the given visitor for this instance
     *
     * @param {EntityVisitor} visitor Visitor
     * @return {*} Object returned by the callback
     */
    visit(visitor) { // eslint-disable-line no-unused-vars
        throw new Error("visit isn't implemented");
    }
}

export { EntityVisitor, VisitableEntity, Visitable };
