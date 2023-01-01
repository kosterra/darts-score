import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { NavigationBar } from './components/navigation/navigation.bar';
import X01ConfigPage from './pages/config/x01';
import X01GamePage from './pages/games/x01'
import StatsPage from './pages/stats';
import AboutPage from './pages/about';

// Importing Sass with Bootstrap CSS
import './resources/scss/main.scss';

function App() {

	return (
		<Router>
			<NavigationBar />
			<Routes>
				<Route path="/x01-new" element={<X01ConfigPage/>} />
				<Route path="/x01" element={<X01GamePage/>} />
				<Route path="/cricket-new" element={<X01ConfigPage/>} />
				<Route path="/cricket" element={<X01GamePage/>} />
				<Route path="/stats" element={<StatsPage/>} />
				<Route path="/about" element={<AboutPage/>} />
			</Routes>
		</Router>
	);
}

export default App;
