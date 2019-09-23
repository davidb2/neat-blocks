import React from 'react';
import ReactDOM from 'react-dom';
import TemporalDifference from './components/TemporalDifference';
import MonteCarlo from './components/MonteCarlo';
import * as serviceWorker from './scripts/serviceWorker';
import './styles/index.css';

ReactDOM.render(
  <MonteCarlo
    rows={5}
    cols={5}
    learningRate={0.99}
    discountFactor={0.1}
    exploreRate={0.2}
    glie={true}
    batchSize={10}
    numTrainEpisodes={100} />,
  document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
