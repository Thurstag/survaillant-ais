/**
 * @licence
 * Copyright 2021-2022 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const DdpgHyperparameter = {
    TAU: "TAU",
    GAMMA: "GAMMA",
    BUFFER_CAPACITY: "BUFFER_CAPACITY",
    TRAIN_BATCH_SIZE: "TRAIN_BATCH_SIZE",
    ACTOR_LEARNING_RATE: "ACTOR_LEARNING_RATE",
    CRITIC_LEARNING_RATE: "CRITIC_LEARNING_RATE"
};

const DdpgDefaultHyperparameter = {};
DdpgDefaultHyperparameter[DdpgHyperparameter.TAU] = 0.005;
DdpgDefaultHyperparameter[DdpgHyperparameter.GAMMA] = 0.99;
DdpgDefaultHyperparameter[DdpgHyperparameter.BUFFER_CAPACITY] = 100000;
DdpgDefaultHyperparameter[DdpgHyperparameter.TRAIN_BATCH_SIZE] = 64;
DdpgDefaultHyperparameter[DdpgHyperparameter.ACTOR_LEARNING_RATE] = 0.001;
DdpgDefaultHyperparameter[DdpgHyperparameter.CRITIC_LEARNING_RATE] = 0.002;

const DdpgHyperparameterInfo = {};
DdpgHyperparameterInfo[DdpgHyperparameter.TAU] = "Tau (See DDPG hyperparameters for more information)";
DdpgHyperparameterInfo[DdpgHyperparameter.GAMMA] = "Gamma (See DDPG hyperparameters for more information)";
DdpgHyperparameterInfo[DdpgHyperparameter.BUFFER_CAPACITY] = "Maximum number of games' data stored for training";
DdpgHyperparameterInfo[DdpgHyperparameter.TRAIN_BATCH_SIZE] = "Number of games selected to do the backpropagation";
DdpgHyperparameterInfo[DdpgHyperparameter.ACTOR_LEARNING_RATE] = "Actor network learning rate";
DdpgHyperparameterInfo[DdpgHyperparameter.CRITIC_LEARNING_RATE] = "Critic network learning rate";

export { DdpgHyperparameter, DdpgDefaultHyperparameter, DdpgHyperparameterInfo };
