/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import { before } from "mocha";
import chai from "chai";
import chaifs from "chai-fs";

before(() => {
    // Load chai-fs
    chai.use(chaifs);
});
