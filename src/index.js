import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import './app/index.css';
import './styles/Global.css';
import App from './app/App.js';
import {PreferencesProvider} from './app/context/PreferencesContext';
import {AuthProvider} from './app/context/AuthContext';
import vitalsUtility from './utils/VitalsUtility';


document.head.appendChild(Object.assign(document.createElement('meta'), {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
}));

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <PreferencesProvider>
                    <App/>
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);

vitalsUtility();