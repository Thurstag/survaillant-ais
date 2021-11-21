/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import { createSurvaillantDeepQNetwork } from './survaillant_deepq_network'

 /**
  * TODO
  */
 export class SurvaillantGameAgent {

    constructor(game, config) {
        this.game = game;
        this.model = createSurvaillantDeepQNetwork(config.height, config.width, config.actions);
        this.modelTarget = createSurvaillantDeepQNetwork(config.height, config.width, config.actions);
    }

    /**
     * TODO
     */
    restart() {

    }

    /**
     * TODO 
     */
    playStep() {

    }

    /**
     * TODO
     */
    trainReplay() {

    }

}