/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import tf from "@tensorflow/tfjs";
import Survaillant from "../survaillant/src/index.js";

// TODO: Doc
class AcAgent {
    // TODO: Doc
    constructor(gamma) {
        this._gamma = gamma;
    }

    // TODO: Doc
    async train(network, gameSupplier, gameAsTensor, epochs, stepsPerEpochs) {
        tf.tidy(() => {
            let episodeReward = 0;
            let runningReward = 0;
            const lnMinParam = tf.scalar(1e-100);

            for (let epoch = 0; epoch < epochs; epoch++) {
                tf.tidy(() => {
                    // Create loss function
                    const lossFunc = () => {
                        const selectedProbs = [];
                        const critics = [];
                        const rewards = [];

                        // Create game
                        const game = gameSupplier();

                        for (let step = 0; step < stepsPerEpochs; step++) {
                            const state = gameAsTensor(game);

                            // Ask network its prediction
                            let [ actionProbs, critic ] = network.predict([ state ]);

                            // Retrieve first batch
                            actionProbs = actionProbs.reshape([ actionProbs.shape[1] ]);
                            critic = critic.reshape([ 1 ]);

                            // Select an action
                            const action = actionProbs.argMax(-1);

                            // Update history arrays
                            critics.push(critic);
                            selectedProbs.push(actionProbs.max());

                            // Apply action
                            const direction = Survaillant.PlayerMoves[action.dataSync()];
                            const reward = game.movePlayer(direction[0], direction[1]);

                            // Define reward (TODO: Create a function)
                            if (reward === Survaillant.ActionConsequence.BAD_MOVEMENT || reward === Survaillant.ActionConsequence.GAME_OVER) {
                                rewards.push(0);
                                console.log("Loss at: " + step + ", reason: " + reward);
                                break;
                            }
                            episodeReward += 1;
                            rewards.push(1);
                        }

                        // Update running reward
                        runningReward = 0.05 * episodeReward + (1 - 0.05) * runningReward;
                        console.log("Running reward at " + epoch + ": " + runningReward);

                        // Compute expected value from rewards
                        const returnsBuffer = tf.buffer([ rewards.length ]);
                        let discountedSum = 0;
                        for (let i = rewards.length - 1; i >= 0; i--) {
                            discountedSum = rewards[i] + this._gamma * discountedSum;
                            returnsBuffer.set(discountedSum, i);
                        }

                        // Normalize returns
                        let returns = returnsBuffer.toTensor();
                        const returnsSubMean = returns.sub(returns.mean());
                        returns = returnsSubMean.div(returnsSubMean.abs().pow(2).mean().sqrt().add(Number.EPSILON));

                        const selectedProbsAsTensor = tf.concat(selectedProbs.map(p => p.expandDims()));
                        const criticsAsTensor = tf.concat(critics);

                        // Compute losses
                        const actorLoss = returns.sub(criticsAsTensor).mul(selectedProbsAsTensor.maximum(lnMinParam).log().neg()).sum();
                        const criticLoss = tf.concat(critics.map((c, i) => tf.losses.huberLoss(c, returns.gather([ i ])).expandDims())).sum();
                        const loss = criticLoss.add(actorLoss);

                        console.log("Actor loss: " + actorLoss.dataSync());
                        console.log("Critic loss: " + criticLoss.dataSync());
                        console.log("Loss: " + loss.dataSync());

                        return loss;
                    };

                    // Update network
                    network.update(lossFunc);
                });
            }
        });
    }
}

export default AcAgent;
