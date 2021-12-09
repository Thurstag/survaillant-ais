/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { EntityVisitor } from "./entity_visitor.js";

const NO_LAYER = -1;

/**
 * Class defining the representation of entities in the tensor (value & layer)
 */
class TensorEntitiesRepresentation {
    #layerConverter;
    #valueConverter;
    #name;

    /**
     * Constructor
     *
     * @param {EntityVisitor} layerConverter Entity to layer converter
     * @param {EntityVisitor} valueConverter Entity to value converter
     * @param {String} name Representation's name
     */
    constructor(layerConverter, valueConverter, name) {
        this.#layerConverter = layerConverter;
        this.#valueConverter = valueConverter;
        this.#name = name;
    }

    /**
     * Get the number of layers
     *
     * @return {number} Layers
     */
    get layers() {
        return this.#layerConverter.layers;
    }

    /**
     * Get its name
     *
     * @return {String} Name
     */
    get name() {
        return this.#name;
    }

    /**
     * Get the layer of the given entity
     *
     * @param {VisitableEntity|Visitable} entity Entity
     * @return {number} Layer
     */
    layer(entity) {
        return entity.visit(this.#layerConverter);
    }

    /**
     * Get the value representing the given entity
     *
     * @param {VisitableEntity|Visitable} entity Entity
     * @return {number} Value
     */
    value(entity) {
        return entity.visit(this.#valueConverter);
    }
}

/**
 * Class defining the value for each entity in the summary representation
 */
class SummaryEntityValue extends EntityVisitor {
    static #TRAP = [ 3, 4, 5 ];
    static #CHEST = [ 2, 6, 7, 8, 9, 10, 11 ];
    static #MONSTER_SPAWN = [ 12, 13, 14, 15 ];

    acceptNone(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(chest) {
        return SummaryEntityValue.#CHEST[chest.timeBeforeSpawn];
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 2;
    }

    acceptTrap(trap) {
        return SummaryEntityValue.#TRAP[trap.loop];
    }

    acceptMonsterSpawn(spawn) {
        return SummaryEntityValue.#MONSTER_SPAWN[spawn.timeBeforeSpawn];
    }
}

/**
 * Class defining the layer for each entity in the summary representation
 */
class SummaryEntityLayer extends EntityVisitor {
    layers = 2;

    acceptNone(_) { // eslint-disable-line no-unused-vars
        return NO_LAYER;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptTrap(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptMonsterSpawn(_) { // eslint-disable-line no-unused-vars
        return 0;
    }
}

/**
 * Class defining the value for each entity in the exhaustive representation
 */
class ExhaustiveEntityValue extends EntityVisitor {
    static CHEST = [ 1, 1, undefined, undefined, undefined, undefined, undefined ];
    static TRAP = [ undefined, 1, undefined ];
    static MONSTER_SPAWN = [ undefined, 1, undefined, undefined ];

    acceptNone(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(chest) {
        return ExhaustiveEntityValue.CHEST[chest.timeBeforeSpawn];
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptTrap(trap) {
        return ExhaustiveEntityValue.TRAP[trap.loop];
    }

    acceptMonsterSpawn(spawn) {
        return ExhaustiveEntityValue.MONSTER_SPAWN[spawn.timeBeforeSpawn];
    }
}

/**
 * Class defining the layer for each entity in the exhaustive representation
 */
class ExhaustiveEntityLayer extends EntityVisitor {
    static #DEADLY_SPAWN_LAYER = 4;
    static #SPAWNING_CHEST = ExhaustiveEntityValue.CHEST.map(e => e !== undefined ? ExhaustiveEntityLayer.#DEADLY_SPAWN_LAYER : NO_LAYER);
    static #TRAP = ExhaustiveEntityValue.TRAP.map(e => e !== undefined ? ExhaustiveEntityLayer.#DEADLY_SPAWN_LAYER : NO_LAYER);
    static #MONSTER_SPAWN = ExhaustiveEntityValue.MONSTER_SPAWN.map(e => e !== undefined ? ExhaustiveEntityLayer.#DEADLY_SPAWN_LAYER : NO_LAYER);

    layers = 5;

    acceptNone(_) { // eslint-disable-line no-unused-vars
        return NO_LAYER;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(chest) {
        return chest.dead ? ExhaustiveEntityLayer.#SPAWNING_CHEST[chest.timeBeforeSpawn] : 2;
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 3;
    }

    acceptTrap(trap) {
        return ExhaustiveEntityLayer.#TRAP[trap.loop];
    }

    acceptMonsterSpawn(spawn) {
        return ExhaustiveEntityLayer.#MONSTER_SPAWN[spawn.timeBeforeSpawn];
    }
}

/**
 * Class defining the value for each entity in the real representation
 */
class RealEntityValue extends EntityVisitor {
    acceptNone(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(chest) {
        return !chest.dead ? 2 : 9 - chest.timeBeforeSpawn;
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 2;
    }

    acceptTrap(trap) {
        return trap.loop + 3;
    }

    acceptMonsterSpawn(spawn) {
        return 9 - spawn.timeBeforeSpawn;
    }
}

/**
 * Class defining the layer for each entity in the real representation
 */
class RealEntityLayer extends EntityVisitor {
    layers = 2;

    acceptNone(_) { // eslint-disable-line no-unused-vars
        return NO_LAYER;
    }

    acceptWall(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptPlayer(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptChest(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptMonster(_) { // eslint-disable-line no-unused-vars
        return 1;
    }

    acceptTrap(_) { // eslint-disable-line no-unused-vars
        return 0;
    }

    acceptMonsterSpawn(_) { // eslint-disable-line no-unused-vars
        return 0;
    }
}

const Representation = {
    SUMMARY: "SUMMARY",
    EXHAUSTIVE: "EXHAUSTIVE",
    REAL: "REAL"
};

const EntitiesRepresentation = {};
EntitiesRepresentation[Representation.SUMMARY] = new TensorEntitiesRepresentation(new SummaryEntityLayer(), new SummaryEntityValue(), Representation.SUMMARY.toLowerCase());
EntitiesRepresentation[Representation.EXHAUSTIVE] = new TensorEntitiesRepresentation(new ExhaustiveEntityLayer(), new ExhaustiveEntityValue(), Representation.EXHAUSTIVE.toLowerCase());
EntitiesRepresentation[Representation.REAL] = new TensorEntitiesRepresentation(new RealEntityLayer(), new RealEntityValue(), Representation.REAL.toLowerCase());


export { EntitiesRepresentation, Representation, NO_LAYER };
