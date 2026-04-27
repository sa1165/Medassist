import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

console.log('App mounting started');

try {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
  console.log('App mounted successfully');
} catch (e) {
  console.error('App mount failed:', e);
}
