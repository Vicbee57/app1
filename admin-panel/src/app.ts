import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { setRoutes } from './routes';
import './index.css';

const App = () => {
    return (
        <BrowserRouter>
            {setRoutes()}
        </BrowserRouter>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));