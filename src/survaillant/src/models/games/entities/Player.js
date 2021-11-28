/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import { VisitableEntity } from "../../../../../common/game/environment/state/entity_visitor.js";
import { v4 as uuidv4 } from "uuid";

class Player extends VisitableEntity {
    constructor(client, playerName, pos, team, avatar) {
        super(client.name, pos);
        this.client = client;
        this.publicId = uuidv4();
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
    get() {
        return {
            ...super.get(),
            team: this.team,
            playerName: this.playerName,
            avatar: this.avatar,
            direction: this.direction,
            animationLoop: this.animationLoop,
            inventory: this.inventory,
        };
    }

    visit(visitor) {
        return visitor.acceptPlayer(this);
    }
}

export default Player;
