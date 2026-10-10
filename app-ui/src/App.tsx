import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';

import NavigationSidebar from './components/navigation/navigation.sidebar';
import PageLoader from './components/elements/page.loader';

const Dashboard = lazy(() => import('./components/dashboard/_dashboard.page'));
const X01ConfigPage = lazy(() => import('./components/game_config/x01/_x01.config.page'));
const X01GamePage = lazy(() => import('./components/games/x01/_x01.game.page'));
const X01GameStats = lazy(() => import('./components/stats/x01/x01.game.stats'));
const CricketConfigPage = lazy(() => import('./components/game_config/cricket/_cricket.config.page'));
const CricketGamePage = lazy(() => import('./components/games/cricket/_cricket.game.page'));
const CricketGameStats = lazy(() => import('./components/stats/cricket/cricket.game.stats'));
const EliminationConfigPage = lazy(() => import('./components/game_config/elimination/_elimination.config.page'));
const EliminationGamePage = lazy(() => import('./components/games/elimination/_elimination.game.page'));
const EliminationGameStats = lazy(() => import('./components/stats/elimination/elimination.game.stats'));
const StatsPage = lazy(() => import('./components/stats/_stats.page'));
const TrainingPage = lazy(() => import('./components/training/_training.page'));
const AboutPage = lazy(() => import('./components/about/_about.page'));
const AdminPage = lazy(() => import('./components/admin/_admin.page'));

import 'primeicons/primeicons.css';
import "./theme/dark/green/theme.scss";

function App() {

    return (
        <PrimeReactProvider>
            <Router>
                <div className="d-flex mb-5 mb-md-0">
                    <NavigationSidebar />
                    <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/x01" element={<X01ConfigPage />} />
                        <Route path="/x01/:id" element={<X01GamePage />} />
                        <Route path="/cricket" element={<CricketConfigPage />} />
                        <Route path="/cricket/:id" element={<CricketGamePage />} />
                        <Route path="/elimination" element={<EliminationConfigPage />} />
                        <Route path="/elimination/:id" element={<EliminationGamePage />} />
                        <Route path="/stats" element={<Navigate replace to="/stats/players" />} />
                        <Route path="/stats/:id" element={<StatsPage />} />
                        <Route path="/stats/games/:id" element={<StatsPage />} />
                        <Route path="/stats/games/x01/:id" element={<X01GameStats />} />
                        <Route path="/stats/games/cricket/:id" element={<CricketGameStats />} />
                        <Route path="/stats/games/elimination/:id" element={<EliminationGameStats />} />
                        <Route path="/training" element={<TrainingPage />} />
                        <Route path="/training/atc" element={<TrainingPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/admin" element={<Navigate replace to="/admin/players" />} />
                        <Route path="/admin/:id" element={<AdminPage />} />
                        <Route path="/admin/games/:id" element={<AdminPage />} />
                        <Route path="/admin/training/:id" element={<AdminPage />} />
                        <Route path="*" element={<Navigate replace to="/" />} />
                    </Routes>
                    </Suspense>
                </div>
            </Router>
        </PrimeReactProvider>
    );
}

export default App;