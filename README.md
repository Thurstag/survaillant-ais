# Survaillant Artificial Intelligences

A set of artificial intelligences playing Survaillant game.

# Requirements

- NodeJS (16.13.0 and above)

# NPM Scripts

- `lint`: a script used to perform code static analysis and code format check
- `lint:fix`: a script used to fix formatting issues in code

Scripts related to modules are explained in Modules section

# Modules

Modules are folders under `src` folder.

## dqn (Deep Q Learning)

A module defining a network that plays the game using a Deep Q Learning model. You can train a network with
```
npm run dqn:train
```
Please refer to the documentation of the script for more information about its parameters (cmd: `npm run dqn:train -- -h`).
