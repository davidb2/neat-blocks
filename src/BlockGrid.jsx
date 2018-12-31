import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import _ from 'lodash';
import './index.css';
import Deque from 'double-ended-queue';

const BLANK = { value: 0, color: 'white' };
const OBSTACLE = { value: 1, color: 'red' };
const PLAYER = { value: 2, color: 'blue' };
const CRASH = { value: 3, color: 'purple' };

class BlockGrid extends React.Component {
  constructor(props) {
    super(props);

    this.score = 0;
    this.ticks = 0;
    this.gameIsOver = false;
    this.openCols = _.range(props.cols);
    this.actionFn = typeof props.actionFn === 'function' ? props.actionFn : (() => {});
    this.board = _.map(Array(props.cols), () => _.fill(Array(props.rows), BLANK));
    this.playerPosition = {
      row: this.board.length-1,
      col: Math.floor(this.board[0].length / 2),
    };
    this.board[this.playerPosition.row][this.playerPosition.col] = PLAYER;

    this.state = {
      board: this.board,
      score: this.score,
    };

    this.moveDown = this.moveDown.bind(this);
    this.checkGameStatus = this.checkGameStatus.bind(this);
  }

  componentDidMount() {
    /* This triggers `componentDidUpdate` to start the game. */
    this.setState({});
  }

  componentDidUpdate() {
    setTimeout(() => {
      if (this.gameIsOver) {
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

    this.gameIsOver = !this.checkGameStatus(oldPosition);
    this.setState({
      board: this.board,
    });
  }

  allowEscapes(playerPosition) {
    const board = this.board;
    const { rows, cols } = this.props;

    const seen = new Set();
    const bfs = new Deque(_.map(this.openCols, col => ({ row: 1, col })));

    const newOpenCols = [];
    const blockingCols = [];

    /* Run bfs on last level. */
    while(!bfs.isEmpty()) {
      const { row, col } = bfs.shift();

      /* Check for already seen states or out-of-bound conditions. */
      const key = `${row}-${col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!(0 <= row && row < rows && 0 <= col && col < cols)) continue;

      if (board[row][col] === OBSTACLE) {
        if (row === 0) {
          blockingCols.push(col);
        }
        continue;
      }

      if (row === 0) {
        newOpenCols.push(col);
      }

      /* Don't search downwards. */
      bfs.push({ row: row, col: col - 1 });
      bfs.push({ row: row, col: col + 1 });
      bfs.push({ row: row - 1, col: col });
    }

    /* Remove the blocking obstacle if it exists. */
    if (newOpenCols.length === 0 && blockingCols.length > 0) {
      const idx = Math.floor(Math.random() * blockingCols.length);
      const col = blockingCols[idx];
      board[0][col] = BLANK;
      newOpenCols.push(col);
      console.log('Removed obstacle @', 0, col);
    }
    this.openCols = newOpenCols;
  }

  moveDown() {
    const board = this.board;
    const playerPosition = this.playerPosition;
    const { rows, cols } = this.props;

    /* Make blocks fall. */
    for (let row = rows - 1; row >= 0; row--) {
      for (let col = 0; col < cols; col++) {
        if (row === 0) {
          board[row][col] = Math.random() < 0.4 ? OBSTACLE : BLANK;
        } else if (!(board[row][col] === PLAYER && board[row-1][col] === BLANK)
                && board[row-1][col] !== PLAYER) {
          board[row][col] = board[row-1][col];
        }
      }
    }

    /* Check for impossible escapes. */
    this.allowEscapes(playerPosition);

    /* Check if the game is over. */
    this.gameIsOver = !this.checkGameStatus(playerPosition);
    if (!this.gameIsOver) {
      this.score++;
    }

    this.setState({
      board,
      score: this.score,
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
