/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";
import { flashlight } from "../common/states.js";
import Survaillant from "../survaillant/src/index.js";
import AcAgent from "./agent.js";
import { random as createRandomNetwork } from "./networks.js";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a model trained with Actor Critic method that plays Survaillant."
    });

    // TODO: Add arguments (use GPU, frames...)

    return parser.parse_args();
}

// TODO: Doc
async function main() {
    // Parse arguments
    const args = parseArguments();

    // Create network
    const radius = 1;
    const network = createRandomNetwork(radius, 128, 0.01); // TODO: Define parameters
    network.printSummary();

    // Create agent
    const agent = new AcAgent(0.99); // TODO: Define parameters

    // Train network
    await agent.train(network, () => Survaillant.createGame(Survaillant.getMaps()[0]), game => flashlight(game, radius), 1000000, 100); // TODO: Define parameters

    // TODO: Export network
}

main()
    // TODO: Disable console lint error
    .catch(console.error);
