import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
				<Route path="/x01/:id" element={<X01GamePage/>} />
				<Route path="/cricket-new" element={<X01ConfigPage/>} />
				<Route path="/cricket" element={<X01GamePage/>} />
				<Route path="/stats" element={<StatsPage/>} />
				<Route path="/about" element={<AboutPage/>} />
			</Routes>
			<ToastContainer 
				position="bottom-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={true}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="dark" />
		</Router>
	);
}

export default App;
