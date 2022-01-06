/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
const TrainingInformationKey = {
    ID: "id",
    AGENT: "agent",
    EPOCHS: "epochs",
    ENV: "env",
    ENV_KEYS: {
        TYPE: "type",
        MAPS: "maps",
        POLICY: "policy",
        STATE: "state",
        STATE_KEYS: {
            TYPE: "type",
            PARAMETERS: "parameters",
            PARAMETERS_KEYS: {
                FLASHLIGHT: {
                    RADIUS: "radius"
                },
                NORMAL: {
                    DIMENSIONS: "dimensions"
                }
            },
            REPRESENTATION: "representation"
        },
        ITEMS: "items"
    }
};

export { TrainingInformationKey };
