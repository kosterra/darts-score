import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import MainNavigation from './components/shared/Navigation/MainNavigation';
import X01Config from './components/game_config/X01Config';
import X01Game from './pages/games/X01'
import Stats from './pages/Stats';
import About from './pages/About';

import GameState from './utils/GameState';

function App() {

  useEffect(() => {
    if(!localStorage.getItem('darts501scoring')) {
      localStorage.setItem('darts501scoring', JSON.stringify({}))
    }
  }, [])


	return (
		<GameState>
			<Router>
				<MainNavigation />
				<main>
					<Routes>
						<Route path="/" element={<X01Config/>} />
						<Route path="/game" element={<X01Config/>} />
						<Route path="/game/x01" element={<X01Game/>} />
						<Route path="/stats" element={<Stats/>} />
						<Route path="/about" element={<About/>} />
					</Routes>
				</main>
			</Router>
		</GameState>
	);
}

export default App;
