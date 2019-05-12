import React, { Component } from 'react';
import BlockGrid from './BlockGrid';
import _ from 'lodash';
import * as synaptic from 'synaptic';

class TemporalDifference extends Component {
  possibleActions = _.flatMap([-1, +1], d => [
    /* { rowDelta: d, colDelta: 0 }, */
    { rowDelta: 0, colDelta: d },
  ]).concat([{ rowDelta: 0, colDelta: 0}])

  constructor(props) {
    super(props);

    window.synaptic = synaptic;
    this.episodes = 0;
    this.scores = [];
    this.batchSize = this.props.batchSize || Infinity;
    this.numTrainEpisodes = this.props.numTrainEpisodes || Infinity;
    this.training = this.episodes < this.numTrainEpisodes;

    /* Construct the value function approximater. */
    const layers = [
      new synaptic.Layer(props.rows * props.cols + 2),
      new synaptic.Layer(5),
      new synaptic.Layer(1),
    ];

    for (let idx = 1; idx < layers.length; idx++) {
      layers[idx-1].project(layers[idx], synaptic.Layer.connectionType.ALL_TO_ALL);
      layers[idx].set({
        squash: synaptic.Neuron.squash.HLIM,
        /* bias: 0, */
      });
    }

    this.network = new synaptic.Network({
      input: layers[0],
      hidden: layers.slice(1, -1),
      output: layers[layers.length-1],
    });

    console.log(this.network.toJSON());
    /* Bind class functions. */
    this.play = this.play.bind(this);
    this.gameOver = this.gameOver.bind(this);
  }

  boardToPartialState(board) {
    return _.chain(board).flattenDeep().map('value').value();
  }

  Q(board, { rowDelta, colDelta }) {
    const state = this.boardToPartialState(board);
    const action = [rowDelta, colDelta];
    return this.network.activate(_.concat(state, action));
  }

  bestAction(board) {
    const state = this.boardToPartialState(board);
    return _.maxBy(this.possibleActions, ({ rowDelta, colDelta }) => {
      const action = [rowDelta, colDelta];
      const output = this.network.activate(_.concat(state, action));
      return output[0];
    });
  }

  updateQ(board, action, reward, nextBoard) {
    /* Q(s, a) += alpha * (r + lambda * max_{a'}{Q(s', a')} - Q(s, a)) */
    const bestAction = this.bestAction(nextBoard);
    const bestQ = this.Q(nextBoard, bestAction);

    const state = this.boardToPartialState(board);
    if (_.isEqual(state, [1, 0, 2, 0])) {
      console.log(action, reward);
    }
    const Q_actual = [reward + this.props.discountFactor * bestQ];
    /* Activate network for Q prediction. */
    this.Q(board, action);

    /* This propagates based on the activation that `Q_pred` made. */
    this.network.propagate(this.decay(this.episodes, this.props.learningRate, 0.01), Q_actual);
  }

  getReward(score) {
    return 10 * (score - this.lastScore);
  }

  reset() {
    if (this.batchSize !== Infinity) {
      this.scores.push(this.lastScore);
    }
    this.lastBoard = null;
    this.lastAction = null;
    this.lastScore = 0;
    if (this.episodes % this.batchSize === this.batchSize-1) {
      console.log(
        `Average score for episodes `
        + `${this.episodes+2-this.batchSize} - ${this.episodes+1} is `
        + `${_.mean(this.scores)}.`
      );
      console.log(
        `Learning rate is `
        + `${this.decay(this.episodes, this.props.learningRate, 0.01)}`
      );
      console.log(this.network.toJSON());
      this.scores = [];
    }
    this.episodes++;
  }

  gameOver({ board, playerPosition, score }) {
    if (this.training && this.lastBoard && this.lastAction) {
      const state = this.boardToPartialState(this.lastBoard);
      if (_.isEqual(state, [1, 0, 2, 0])) {
        console.log(this.lastAction, -10);
      }
      /* Activate network for Q prediction. */
      this.Q(this.lastBoard, this.lastAction);

      const reward = -10;
      const Q_actual = [reward];
      /* This propagates based on the activation that `Q_pred` made. */
      this.network.propagate(this.decay(this.episodes, this.props.learningRate, 0.01), Q_actual);
    }
    this.reset();
    setTimeout(this.forceUpdate(), this.training ? 0 : 1000);
  }

  decay(t, C, r = 1) {
    return C * Math.exp(-r * t);
  }

  play({ board, playerPosition, score }) {
    if (this.training && this.lastBoard && this.lastAction && this.lastScore) {
      const reward = this.getReward(score);
      this.updateQ(this.lastBoard, this.lastAction, reward, board);
    }

    let explorePercentage = this.props.exploreRate;
    if (!this.training || this.episodes >= this.numTrainEpisodes) {
      explorePercentage = 0;
      this.training = false;
    } else if (this.props.glie) {
      explorePercentage = this.decay(this.episodes, this.props.exploreRate, 0.01);
    }

    const action = _.random(true) < explorePercentage ?
        _.sample(this.possibleActions) : this.bestAction(board);

    if (this.training) {
      const state = this.boardToPartialState(board);
      if (_.isEqual(state, [1, 0, 2, 0])) {
        // console.log(action, this.Q(board, action));
      }
      // console.log(_.concat(state, action.rowDelta, action.colDelta), this.Q(board, action));
    }

    this.lastBoard = _.cloneDeep(board);
    this.lastAction = _.cloneDeep(action);
    this.lastScore = score;

    return action;
  }

  render() {
    return (
        <BlockGrid
           rows={this.props.rows}
           cols={this.props.cols}
           tickMs={this.training ? 0 : 500}
           density={0.5}
           gameOverFn={this.gameOver}
           actionFn={this.play} />
    );
  }
}

export default TemporalDifference;
