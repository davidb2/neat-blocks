import React, { Component } from 'react';
import BlockGrid from './BlockGrid';

class Human extends Component {
  constructor(props) {
    super(props);

    this.action = { rowDelta: 0, colDelta: 0 };

    this.changeAction = this.changeAction.bind(this);
    this.play = this.play.bind(this);
    this.gameOver = this.gameOver.bind(this);
  }

  play({ board, playerPosition, score }) {
    const playedAction = this.action;
    this.action = { rowDelta: 0, colDelta: 0 };
    return playedAction;
  }

  changeAction(e) {
    switch (e.key) {
    case 'ArrowRight':
      this.action.colDelta = +1;
      this.action.rowDelta = 0;
      break;
    case 'ArrowLeft':
      this.action.colDelta = -1;
      this.action.rowDelta = 0;
      break;
    case 'ArrowUp':
      this.action.rowDelta = -1;
      this.action.colDelta = 0;
      break;
    case 'ArrowDown':
      this.action.rowDelta = +1;
      this.action.colDelta = 0;
      break;
    case 'r':
      /* Restart the game. */
      this.forceUpdate();
      break;
    default:
      break;
    }
  }

  gameOver({ board, playerPosition, score }) {
    console.log('game is over');
  }

  componentDidMount() {
    window.addEventListener('keydown', this.changeAction, true);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.changeAction, true);
  }

  render() {
    return (
        <BlockGrid
           rows={10}
           cols={10}
           tickMs={10}
           gameOverFn={this.gameOver}
           actionFn={this.play} />
    );
  }
}

export default Human;
