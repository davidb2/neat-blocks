import React, { Component } from 'react';
import BlockGrid from './BlockGrid';
import _ from 'lodash';
import * as synaptic from 'synaptic';
import { product, tee, toArray } from 'iter-tools/es2015';

class TemporalDifference extends Component {
  possibleActions = _.flatMap([-1, +1], d => [
    /* { rowDelta: d, colDelta: 0 }, */
    { rowDelta: 0, colDelta: d },
  ]).concat([{ rowDelta: 0, colDelta: 0}]);

  constructor(props) {
    super(props);

    window.synaptic = synaptic;
    this.episodes = 0;
    this.scores = [];
    this.batchSize = this.props.batchSize || Infinity;
    this.numTrainEpisodes = this.props.numTrainEpisodes || Infinity;
    this.training = this.episodes < this.numTrainEpisodes;

    this.possibleStates = toArray(product(...tee(_.range(-1, this.props.rows).concat(undefined), 5)));
    /* Initialize Q-table and N-table. */
    this.Qtable = {};
    this.Ntable = {};
    _.forEach(this.possibleStates, state => {
      this.Qtable[state] = {};
      this.Ntable[state] = 0;
      _.forEach(this.possibleActions, ({ rowDelta, colDelta }) => {
        const action = [rowDelta, colDelta];
        this.Qtable[state][action] = 0;
      })
    });

    /* Bind class functions. */
    this.play = this.play.bind(this);
    this.gameOver = this.gameOver.bind(this);
  }

  boardToPartialState(board, { row, col }) {
    const getCol = c => _.map(board, boardRow => boardRow[c]);
    const last = c => {
      if (board[0][c] === undefined) return undefined;
      return _.findLastIndex(getCol(c), ({ value }) => _.has([1, 3], value));
    };
    const state = [
      last(col-2),
      last(col-1),
      last(col),
      last(col+1),
      last(col+2),
    ];
    return state;
  }

  Q(state, { rowDelta, colDelta }) {
    const action = [rowDelta, colDelta];
    return this.Qtable[state][action];
  }

  bestAction(state) {
    return _.maxBy(this.possibleActions, ({ rowDelta, colDelta }) => {
      const action = [rowDelta, colDelta];
      return this.Qtable[state][action];
    });
  }

  updateQ(state, { rowDelta, colDelta }, reward, nextState) {
    /* Q(s, a) += alpha * (r + lambda * max_{a'}{Q(s', a')} - Q(s, a)) */
    const action = [rowDelta, colDelta];
    const bestAction = this.bestAction(nextState);
    const bestQ = this.Q(nextState, bestAction);
    const Q_actual = reward + this.props.discountFactor * bestQ;
    const lr = this.decay(this.episodes, this.props.learningRate, 0.01);
    this.Qtable[state][action] += lr * (Q_actual - this.Qtable[state][action]);
  }

  getReward(board, { row, col }, score) {
    const s =
      _.chain(toArray(product(...tee([-1, 0, +1], 2))))
       .map(([dr, dc]) => _.get(board, `${row+dr}.${col+dc}.value`) === 0 ? 0 : 1)
       .sum()
       .value();

    return -0.01 * s;
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
      this.scores = [];
    }
    this.episodes++;
  }

  gameOver({ board, playerPosition, score }) {
    if (this.training && this.lastBoard && this.lastAction) {
      const reward = -1000;
      const state = this.boardToPartialState(this.lastBoard, this.lastPlayerPosition);
      const nextState = this.boardToPartialState(board, playerPosition);
      this.updateQ(state, this.lastAction, reward, nextState);
    }
    this.reset();
    setTimeout(this.forceUpdate(), this.training ? 0 : 1000);
  }

  decay(t, C, r = 1) {
    return C * Math.exp(-r * t);
  }

  play({ board, playerPosition, score }) {
    if (this.training && this.lastBoard && this.lastAction && this.lastScore) {
      const reward = this.getReward(board, playerPosition, score);
      const state = this.boardToPartialState(this.lastBoard, this.lastPlayerPosition);
      const nextState = this.boardToPartialState(board, playerPosition);
      this.updateQ(state, this.lastAction, reward, nextState);
    }

    const state = this.boardToPartialState(board, playerPosition);

    let explorePercentage = this.props.exploreRate;
    if (!this.training || this.episodes >= this.numTrainEpisodes) {
      explorePercentage = 0;
      this.training = false;
    } else if (this.props.glie) {
      explorePercentage = this.decay(this.episodes, this.props.exploreRate, 0.01);
      if (this.Ntable[state] < this.props.nEps) {
        explorePercentage = 1;
      }
      this.Ntable[state]++;
    }

    const action = _.random(true) < explorePercentage ?
        _.sample(this.possibleActions) : this.bestAction(state);

    this.lastBoard = _.cloneDeep(board);
    this.lastAction = _.cloneDeep(action);
    this.lastPlayerPosition = _.cloneDeep(playerPosition);
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
