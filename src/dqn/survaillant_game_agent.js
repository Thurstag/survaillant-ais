/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

import { createSurvaillantDeepQNetwork } from "./survaillant_deepq_network.js";

/**
  * TODO
  */
class SurvaillantGameAgent {

    constructor(height, width) {
        this.model = createSurvaillantDeepQNetwork(height, width);
        this.modelTarget = createSurvaillantDeepQNetwork(height, width);
        this.model.summary();
    }

    /**
     * TODO
     */
    restart() {

    }

    /**
     * TODO 
     */
    playStep(action) {
        console.log(action);
    }

    /**
     * TODO
     */
    trainReplay() {

    }

}

export default SurvaillantGameAgent;