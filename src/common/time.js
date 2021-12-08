/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import TimeUnit from "timeunit";

/**
 * Recorder of operations
 */
class OperationsRecorder {
    #operations = [];
    #start;

    /**
     * Declare the start of an operation
     */
    start() {
        this.#start = process.hrtime.bigint();
    }

    /**
     * Declare the end of the current operation and record its duration
     */
    end() {
        this.#operations.push(process.hrtime.bigint() - this.#start);
    }

    /**
     * Get the frequency of recorded operations (unit: operation per second)
     *
     * @return {number} Frequency
     */
    ops() {
        return 1 / TimeUnit.nanoseconds.toSeconds(Number(this.#operations.reduce((a, b) => a + b, 0n) / BigInt(this.#operations.length)));
    }
}

export { OperationsRecorder };
