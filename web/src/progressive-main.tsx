import ReactDOM from 'react-dom/client';
import './style.css';
import { ProgressiveApp } from './progressive/ProgressiveApp';

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('Missing #app root');
}

ReactDOM.createRoot(appElement).render(<ProgressiveApp />);
