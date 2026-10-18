import React from 'react';
import ReactDOM from 'react-dom/client';
import { updateLocaleOption } from 'primereact/api';
import App from './App';

// calendars start the week on Monday, as in Switzerland and most of Europe
updateLocaleOption('firstDayOfWeek', 1, 'en');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
