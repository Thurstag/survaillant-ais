/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import Entity from "../Entity.js";
import uuid from "uuid";

class Player extends Entity {
    constructor(client, playerName, pos, team, avatar) {
        super(client.name, pos);
        this.client = client;
        this.publicId = uuid.v4();
        this.playerName = playerName;
        this.team = team;
        this.avatar = avatar;

        this.nextMove = null;
        this.nextPos = null;
        this.objectCollision = false;
        this.playerCollision = false;

        this.inventory = {
            arrow: 1,
            dynamite: 1,
            bomb: 1,
        };
        this.selectedItem = "";

        this.type = "player";
        this.direction = "right";
        this.heading = "right";
        this.animationLoop = 0;

        // Other
        this.deathThisTurn = true; // to prevent the animation to loop and other bugs
    }
    get(from = undefined) {
        return {
            ...super.get(),

            client: from && from.id === this.client.id ?
                this.client.get() : this.client.getPrivate(),
            publicId: this.publicId,
            team: this.team,
            playerName: this.playerName,
            avatar: this.avatar,
            direction: this.direction,
            animationLoop: this.animationLoop,
            inventory: this.inventory,
        };
    }
}

export default Player;
