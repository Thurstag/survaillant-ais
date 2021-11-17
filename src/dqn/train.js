/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { ArgumentParser } from "argparse";

/**
 * Parse program's arguments
 *
 * @return {Object} Parsed arguments
 */
function parseArguments() {
    const parser = new ArgumentParser({
        description: "Training script for a DQN model that plays Survaillant."
    });

    // TODO: Add arguments (use GPU, frames...)

    return parser.parse_args();
}

/**
 * Script entry point
 */
function main() {
    // Parse arguments
    const args = parseArguments();

    // TODO
}

main();
