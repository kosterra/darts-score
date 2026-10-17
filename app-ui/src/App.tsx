import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';

import AppNavigation from './components/navigation/app.navigation';
import AppBanner from './components/banner/app.banner';
import AppTooltip from './components/elements/app.tooltip';
import PageLoader from './components/elements/page.loader';
import AuthState from './utils/auth.state';
import { useAuth } from './utils/auth.context';

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
const PlayerProfilePage = lazy(() => import('./components/players/_player.profile.page'));
const ClubListsPage = lazy(() => import('./components/admin/_club.lists.page'));
const AdminPage = lazy(() => import('./components/admin/_admin.page'));
const AdministrationPage = lazy(() => import('./components/administration/_administration.page'));
const ClubsPage = lazy(() => import('./components/clubs/_clubs.page'));
const BadgesPage = lazy(() => import('./components/badges/_badges.page'));
const ProfilePage = lazy(() => import('./components/profile/_profile.page'));
const LoginPage = lazy(() => import('./components/auth/login.page'));
const LandingPage = lazy(() => import('./components/landing/_landing.page'));
const RegisterPage = lazy(() => import('./components/auth/register.page'));
const ForgotPasswordPage = lazy(() => import('./components/auth/forgot.password.page'));
const ResetPasswordPage = lazy(() => import('./components/auth/reset.password.page'));

import 'primeicons/primeicons.css';
import "./theme/dark/green/theme.scss";

// The old per-type game lists are one list with a type filter now
function GameListRedirect() {
    const { id } = useParams();
    return <Navigate replace to={`/games?type=${id}`} />;
}

// Pages that work without a selected club
const CLUBLESS_PATHS = ['/clubs', '/profile', '/about', '/administration', '/admin/clubs', '/admin/users', '/admin/players', '/admin/games', '/admin/trainings', '/admin/alerts', '/admin/logs'];

function AppContent() {
    const { user, activeClub, isGlobalAdmin, loading } = useAuth();
    const { pathname } = useLocation();

    if (loading) return <PageLoader />;

    // Links from reset and invitation mails work whoever is logged in on this device
    if (pathname === '/reset-password') {
        return <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>;
    }

    if (!user) {
        return (
            <Suspense fallback={<PageLoader />}>
                <AppBanner />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="*" element={<Navigate replace to="/login" />} />
                </Routes>
            </Suspense>
        );
    }

    // Without a club there is nothing to play with yet: send the user to create one.
    // A global admin without a club of their own looks after the app instead.
    if (!activeClub && !CLUBLESS_PATHS.includes(pathname)) {
        return <Navigate replace to={isGlobalAdmin ? '/administration' : '/clubs'} />;
    }

    return (
        <div className="d-flex mb-5 mb-md-0">
            <AppNavigation />
            {/* the banner sits on top of the pages, next to the menu */}
            <div className="app-content">
                <AppBanner />
                {/* Keyed by club so every page reloads its data after switching clubs */}
                <Suspense fallback={<PageLoader />} key={activeClub?.id ?? 'no-club'}>
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
                    <Route path="/stats/games/:id" element={<GameListRedirect />} />
                    <Route path="/players" element={<ClubListsPage list="players" />} />
                    <Route path="/players/:id" element={<PlayerProfilePage />} />
                    <Route path="/games" element={<ClubListsPage list="games" />} />
                    <Route path="/trainings" element={<ClubListsPage list="trainings" />} />
                    <Route path="/stats/games/x01/:id" element={<X01GameStats />} />
                    <Route path="/stats/games/cricket/:id" element={<CricketGameStats />} />
                    <Route path="/stats/games/elimination/:id" element={<EliminationGameStats />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/training/atc" element={<TrainingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/badges" element={<BadgesPage />} />
                    <Route path="/badges/:id" element={<BadgesPage />} />
                    <Route path="/clubs" element={<ClubsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/administration" element={<AdministrationPage />} />
                    <Route path="/admin" element={<Navigate replace to="/admin/players" />} />
                    <Route path="/admin/:id" element={<AdminPage />} />
                    <Route path="/admin/games/:id" element={<AdminPage />} />
                    <Route path="/admin/training/:id" element={<AdminPage />} />
                    <Route path="*" element={<Navigate replace to="/" />} />
                </Routes>
                </Suspense>
            </div>
        </div>
    );
}

function App() {

    return (
        <PrimeReactProvider>
            <AuthState>
                <Router>
                    <AppContent />
                    <AppTooltip />
                </Router>
            </AuthState>
        </PrimeReactProvider>
    );
}

export default App;