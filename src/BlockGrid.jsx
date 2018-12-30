import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import _ from 'lodash';
import './index.css';

const BLANK = { value: 0, color: 'white' };
const OBSTACLE = { value: 1, color: 'red' };
const PLAYER = { value: 2, color: 'blue' };
const CRASH = { value: 3, color: 'purple' };

class BlockGrid extends React.Component {
  constructor(props) {
    super(props);

    this.board = _.map(Array(props.cols), () => _.fill(Array(props.rows), BLANK));
    this.playerPosition = {
      row: this.board.length-1,
      col: Math.floor(this.board[0].length / 2),
    };
    this.score = 0;
    this.ticks = 0;

    this.actionFn = props.actionFn;
    if ((typeof props.actionFn) !== 'function') {
      this.actionFn = () => {};
    }

    this.board[this.playerPosition.row][this.playerPosition.col] = PLAYER;

    this.state = {
      board: this.board,
      score: this.score,
      gameIsOver: false,
    };

    this.moveDown = this.moveDown.bind(this);
    this.checkGameStatus = this.checkGameStatus.bind(this);
  }

  componentDidMount() {
    this.setState({});
  }

  componentDidUpdate() {
    setTimeout(() => {
      if (this.state.gameIsOver) {
        return;
      } else if (this.ticks++ % 10 === 0) {
        this.moveDown();
      } else {
        const action = this.actionFn({
          board: this.board,
          playerPosition: this.playerPosition,
          score: this.score,
        });
        this.movePlayer(action);
      }
    }, this.props.tickMs);
  }

  movePlayer(direction) {
    const oldPosition = {
      row: this.playerPosition.row,
      col: this.playerPosition.col,
    };
    const newPosition = {
      row: this.playerPosition.row + direction.rowDelta,
      col: this.playerPosition.col + direction.colDelta,
    };

    if (0 <= newPosition.row && newPosition.row < this.props.rows &&
        0 <= newPosition.col && newPosition.col < this.props.cols) {
      this.playerPosition = newPosition;
    }

    const gameIsOver = !this.checkGameStatus(oldPosition);

    this.setState({
      gameIsOver,
      board: this.board,
    });
  }

  moveDown() {
    const board = this.board;
    const playerPosition = this.playerPosition;
    const { rows, cols } = this.props;

    /* Make blocks fall. */
    for (let row = rows - 1; row >= 0; row--) {
      for (let col = 0; col < cols; col++) {
        if (row === 0) {
          board[row][col] = Math.random() < 0.2 ? OBSTACLE : BLANK;
        } else if (!(board[row][col] === PLAYER && board[row-1][col] === BLANK)
                && board[row-1][col] !== PLAYER) {
          board[row][col] = board[row-1][col];
        }
      }
    }

    /* Check if the game is over. */
    const gameIsOver = !this.checkGameStatus(playerPosition);
    if (!gameIsOver) {
      this.score++;
    }

    this.setState({
      board,
      score: this.score,
      gameIsOver,
    });
  }

  checkGameStatus(oldPosition) {
    const board = this.board;
    const playerPosition = this.playerPosition;

    if (board[playerPosition.row][playerPosition.col] === OBSTACLE) {
      console.log('game is over');
      board[oldPosition.row][oldPosition.col] = BLANK;
      board[playerPosition.row][playerPosition.col] = CRASH;
      return false;
    } else {
      board[oldPosition.row][oldPosition.col] = BLANK;
      board[playerPosition.row][playerPosition.col] = PLAYER;
      return true;
    }
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
        <Grid container className={classes.root} spacing={8}>
          <Grid item xs={12}>{
            _.map(this.state.board, (row, r) => (
              <Grid container className={classes.demo} key={r} spacing={8}>{
                _.map(row, (block, c) => (
                  <Grid item key={`${r}.${c}`}>
                    <Paper className={classes.paper} style={{ backgroundColor: block.color }} />
                  </Grid>
                ))}
              </Grid>
              ))}
          </Grid>
        </Grid>
        <h3>{this.state.score}</h3>
      </div>
    );
  }
}

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    height: 50,
    width: 50,
  },
  control: {
    padding: theme.spacing.unit * 2,
  },
});

export default withStyles(styles)(BlockGrid);
