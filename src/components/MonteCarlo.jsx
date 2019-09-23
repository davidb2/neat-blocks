import React, { Component } from 'react';
import BlockGrid from './BlockGrid';
import _ from 'lodash';
import random from 'random';
import * as neataptic from 'neataptic';
import Deque from 'double-ended-queue';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';

const TIMEOUT = 200;

class MonteCarlo extends Component {
  possibleActions = _.flatMap([-1, +1], d => [
    /* { rowDelta: d, colDelta: 0 }, */
    { rowDelta: 0, colDelta: d },
  ]).concat([{ rowDelta: 0, colDelta: 0}])

  constructor(props) {
    super(props);
    window.neataptic = neataptic;

    this.episodes = 0;
    this.scores = [];
    this.episodeRewards = [];
    this.experienceReplay = new Deque(100);
    this.batchSize = this.props.batchSize || Infinity;
    this.numTrainEpisodes = this.props.numTrainEpisodes || Infinity;
    this.training = this.episodes < this.numTrainEpisodes;
    this.network = new neataptic.Network(props.rows * props.cols + 2, 1);

    this.state = {
      graph: this.network.graph(),
    };

    this.play = this.play.bind(this);
    this.gameOver = this.gameOver.bind(this);
  }

  boardToPartialState(board) {
    return _.chain(board).flattenDeep().map('value').value();
  }

  evolveNetwork(episodeRewards) {
    let cumulativeReward = 0;
    for (let idx = episodeRewards.length - 1; idx >= 0; idx--) {
      const { state, action, reward } = episodeRewards[idx];
      cumulativeReward = reward + this.props.discountFactor * cumulativeReward;
      this.experienceReplay.push({
        input: _.concat(this.boardToPartialState(state), action.rowDelta, action.colDelta),
        output: [cumulativeReward],
      });
    }

    const numReplays = _.toInteger(_.min([
      Math.ceil(Math.abs(random.normal(/* mu */ 1, /* sigma */ this.experienceReplay.length)())),
      this.experienceReplay.length,
    ])) || 1;
    const trainingData = _.sampleSize(this.experienceReplay.toArray(), numReplays);

    this.network.evolve(trainingData, {
      iterations: 100,
      growth: 0.00001 /* this.decay(this.episodes, this.props.learningRate, 0.1) */,
    }).then(({ error }) => {
      console.log(error);
      this.reset();
      console.log(this.network.graph());
      this.setState({
        graph: this.network.graph(),
      });
    });
  }

  gameOver({ board, playerPosition, score }) {
    if (this.training) {
      this.episodeRewards.push({
        state: this.lastBoard,
        action: this.lastAction,
        reward: -10,
      });

      this.evolveNetwork(this.episodeRewards);
    } else {
      this.reset();
      setTimeout(this.forceUpdate(), TIMEOUT);
    }
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

  decay(t, C, r = 1) {
    return C * Math.exp(-r * t);
  }

  getReward(score) {
    return 10 * (score - this.lastScore);
  }

  reset() {
    if (this.batchSize !== Infinity) {
      this.scores.push(this.lastScore);
    }
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
      console.log(
        `Explore rate is `
        + `${this.calculateExplorePercentage()}`
      );
      console.log(this.network.toJSON());
      this.scores = [];
    }
    this.lastBoard = null;
    this.lastAction = null;
    this.lastScore = 0;
    this.episodeRewards = [];
    this.episodes++;
  }

  calculateExplorePercentage() {
    if (!this.training || this.episodes >= this.numTrainEpisodes) {
      this.training = false;
      return 0;
    } else if (this.props.glie) {
      return this.decay(this.episodes, this.props.exploreRate, 0.01);
    } else {
      return this.props.exploreRate;
    }
  }

  play({ board, playerPosition, score }) {
    if (this.training && this.lastBoard && this.lastAction && this.lastScore) {
      this.episodeRewards.push({
        state: this.lastBoard,
        action: this.lastAction,
        reward: this.getReward(score),
      });
    }

    const explorePercentage = this.calculateExplorePercentage();
    let action = this.bestAction(board);
    if (_.random(true) < explorePercentage) {
      action = _.sample(this.possibleActions);
    }

    this.lastBoard = _.cloneDeep(board);
    this.lastAction = _.cloneDeep(action);
    this.lastScore = score;

    return action;
  }

  transformGraph(graph) {
    const maxEdgeWeight = _.maxBy(graph.links, 'weight').weight;
    const minEdgeWeight = _.minBy(graph.links, 'weight').weight;
    const colorRange = ['#ffffff', '#000000'];
    const color =
      d3.scaleLinear()
        .domain([minEdgeWeight, maxEdgeWeight])
        .range(colorRange);

    return {
      nodes: _.map(graph.nodes, node => ({
        id: node.id,
        name: node.name,
      })),
      links: _.map(graph.links, edge => ({
        source: edge.source,
        target: edge.target,
        color: color(edge.weight),
      })),
    };
  }

  modifyForceGraph(forceGraph) {
    forceGraph.d3Force('charge', d3.forceManyBody().strength(-1000));
  }

  render() {
    return (
        <div>
          <BlockGrid
             rows={this.props.rows}
             cols={this.props.cols}
             tickMs={this.training ? 0 : 50}
             density={0.5}
             gameOverFn={this.gameOver}
             actionFn={this.play} />
          <ForceGraph2D
            ref={this.modifyForceGraph}
            graphData={this.transformGraph(this.state.graph)}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            dagMode='lr'
            dagLevelDistance={100}
            d3VelocityDecay={0.88}
            style={{ height: '1000px', width: '1000px' }} />
        </div>
    );
  }
}

export default MonteCarlo;
