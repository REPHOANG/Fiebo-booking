import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
// Remove legacy keys that are no longer used
try {
  localStorage.removeItem('bookingDrafts');
  localStorage.removeItem('bookedSlots');
  localStorage.removeItem('_fs'); // key cũ (auth), giờ chỉ dùng accessToken
} catch (e) {
  // ignore
}
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
