import React from 'react';
import ReactDOM from 'react-dom';
import TemporalDifference from './components/TemporalDifference';
import * as serviceWorker from './scripts/serviceWorker';
import './styles/index.css';

ReactDOM.render(
  <TemporalDifference
    rows={2}
    cols={2}
    learningRate={0.7}
    discountFactor={0.1}
    exploreRate={0.4}
    glie={true}
    batchSize={100}
    numTrainEpisodes={500} />,
  document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
