/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */
import winston from "winston";

const LOGGER = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.simple(),
        winston.format.printf(info => `${info.level}: [${info.timestamp}] ${info.message}`)
    ),
    transports: [
        new winston.transports.Console()
    ]
});

/**
 * Log the given error
 *
 * @param {Error} error Error
 */
LOGGER.exception = (error) => {
    LOGGER.error(error.stack);
};

export default LOGGER;
