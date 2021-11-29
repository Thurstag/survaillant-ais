/**
 * @licence
 * Copyright 2021-2021 - Survaillant Artificial Intelligences
 * Licensed under MIT or any later version
 * Refer to the LICENSE file included.
 */

const PpoHyperparameter = {
    STEPS_PER_EPOCH: "STEPS_PER_EPOCH",
    GAMMA: "GAMMA",
    CLIP_RATIO: "CLIP_RATIO",
    POLICY_LEARNING_RATE: "POLICY_LEARNING_RATE",
    VALUE_LEARNING_RATE: "VALUE_LEARNING_RATE",
    TRAIN_POLICY_ITERATIONS: "TRAIN_POLICY_ITERATIONS",
    TRAIN_VALUE_ITERATIONS: "TRAIN_VALUE_ITERATIONS",
    LAM: "LAM",
    TARGET_KL: "TARGET_KL",
    HIDDEN_LAYER_UNITS: "HIDDEN_LAYER_UNITS"
};

const PpoDefaultHyperparameter = {};
PpoDefaultHyperparameter[PpoHyperparameter.STEPS_PER_EPOCH] = 4000;
PpoDefaultHyperparameter[PpoHyperparameter.GAMMA] = 0.99;
PpoDefaultHyperparameter[PpoHyperparameter.CLIP_RATIO] = 0.2;
PpoDefaultHyperparameter[PpoHyperparameter.POLICY_LEARNING_RATE] = 3E-4;
PpoDefaultHyperparameter[PpoHyperparameter.VALUE_LEARNING_RATE] = 1E-3;
PpoDefaultHyperparameter[PpoHyperparameter.TRAIN_POLICY_ITERATIONS] = 80;
PpoDefaultHyperparameter[PpoHyperparameter.TRAIN_VALUE_ITERATIONS] = 80;
PpoDefaultHyperparameter[PpoHyperparameter.LAM] = 0.97;
PpoDefaultHyperparameter[PpoHyperparameter.TARGET_KL] = 0.01;
PpoDefaultHyperparameter[PpoHyperparameter.HIDDEN_LAYER_UNITS] = [ 64, 64 ];

const PpoHyperparameterInfo = {};
PpoHyperparameterInfo[PpoHyperparameter.STEPS_PER_EPOCH] = "Game steps to done at each epoch";
PpoHyperparameterInfo[PpoHyperparameter.GAMMA] = "Gamma (see PPO hyperparameters for more information)";
PpoHyperparameterInfo[PpoHyperparameter.CLIP_RATIO] = "Clip ratio (see PPO hyperparameters for more information)";
PpoHyperparameterInfo[PpoHyperparameter.POLICY_LEARNING_RATE] = "Policy network learning rate";
PpoHyperparameterInfo[PpoHyperparameter.VALUE_LEARNING_RATE] = "Value network learning rate";
PpoHyperparameterInfo[PpoHyperparameter.TRAIN_POLICY_ITERATIONS] = "Training iterations to do for policy network";
PpoHyperparameterInfo[PpoHyperparameter.TRAIN_VALUE_ITERATIONS] = "Training iterations to do for value network";
PpoHyperparameterInfo[PpoHyperparameter.LAM] = "Lam (see PPO hyperparameters for more information)";
PpoHyperparameterInfo[PpoHyperparameter.TARGET_KL] = "Target KL (see PPO hyperparameters for more information)";
PpoHyperparameterInfo[PpoHyperparameter.HIDDEN_LAYER_UNITS] = "Units of each layer composing the intermediate layers of networks";

export { PpoHyperparameter, PpoDefaultHyperparameter, PpoHyperparameterInfo };
