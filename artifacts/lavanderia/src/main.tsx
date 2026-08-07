import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import { setBaseUrl } from '@workspace/api-client-react';

alert('VITE_API_URL='+import.meta.env.VITE_API_URL+';BASE_URL=>'+import.meta.env.BASE_URL)
setBaseUrl(import.meta.env.VITE_API_URL.replace(/\/$/, ''));
createRoot(document.getElementById('root')!).render(<App />);