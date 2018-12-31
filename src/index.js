import React from 'react';
import ReactDOM from 'react-dom';
import Human from './components/Human';
import * as serviceWorker from './scripts/serviceWorker';
import './styles/index.css';

ReactDOM.render(
  <Human />,
  document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
