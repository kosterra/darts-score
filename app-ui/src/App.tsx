import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { noteLocation } from './utils/navigation.trail';
import { PrimeReactProvider } from 'primereact/api';

import AppNavigation from './components/navigation/app.navigation';
import AppBanner from './components/banner/app.banner';
import InstallHint from './components/install/install.hint';
import SessionWatch from './components/session/session.watch';
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
const ClockConfigPage = lazy(() => import('./components/game_config/clock/_clock.config.page'));
const ClockGamePage = lazy(() => import('./components/games/clock/_clock.game.page'));
const ClockGameStats = lazy(() => import('./components/stats/clock/clock.game.stats'));
const MoreGamesPage = lazy(() => import('./components/rules/_more.games.page'));
const RulesGameSetup = lazy(() => import('./components/rules/rules.game.setup'));
const RulesGame = lazy(() => import('./components/rules/rules.game'));
const RulesGameStats = lazy(() => import('./components/rules/rules.game.stats'));
const RulesTraining = lazy(() => import('./components/rules/rules.training'));
const StatsPage = lazy(() => import('./components/stats/_stats.page'));
const TrainingPage = lazy(() => import('./components/training/_training.page'));
const X01BotPage = lazy(() => import('./components/training/x01.bot.page'));
const AboutPage = lazy(() => import('./components/about/_about.page'));
const PlayerProfilePage = lazy(() => import('./components/players/_player.profile.page'));
const ClubListsPage = lazy(() => import('./components/admin/_club.lists.page'));
const AdminPage = lazy(() => import('./components/admin/_admin.page'));
const AdministrationPage = lazy(() => import('./components/administration/_administration.page'));
const FairPlayPage = lazy(() => import('./components/fairplay/_fair.play.page'));
const NotificationsPage = lazy(() => import('./components/notifications/_notifications.page'));
const MyPlayerPage = lazy(() => import('./components/players/_my.player.page'));
const PlayerEditPage = lazy(() => import('./components/players/_player.edit.page'));
const MyStatistics = lazy(() => import('./components/players/my.statistics'));
const ClubsPage = lazy(() => import('./components/clubs/_clubs.page'));
const ClubEditPage = lazy(() => import('./components/clubs/_club.edit.page'));
const BadgesPage = lazy(() => import('./components/badges/_badges.page'));
const ProfilePage = lazy(() => import('./components/profile/_profile.page'));
const LoginPage = lazy(() => import('./components/auth/login.page'));
const LandingPage = lazy(() => import('./components/landing/_landing.page'));
const RegisterPage = lazy(() => import('./components/auth/register.page'));
const ForgotPasswordPage = lazy(() => import('./components/auth/forgot.password.page'));
const ResetPasswordPage = lazy(() => import('./components/auth/reset.password.page'));
const QuickSetupPage = lazy(() => import('./components/quick/_quick.setup.page'));
const QuickGamePage = lazy(() => import('./components/quick/_quick.game.page'));

import 'primeicons/primeicons.css';
import "./theme/dark/green/theme.scss";

// The old per-type game lists are one list with a type filter now
function GameListRedirect() {
    const { id } = useParams();
    return <Navigate replace to={`/games?type=${id}`} />;
}

// Pages that work without a selected club
const CLUBLESS_PATHS = ['/my-clubs', '/player-profile', '/clubs', '/profile', '/about', '/notifications', '/system-settings', '/administration', '/admin/clubs', '/admin/users', '/admin/players', '/admin/games', '/admin/trainings', '/admin/quick-games', '/admin/alerts', '/admin/logs', '/admin/fair-play'];

function AppContent() {
    const { user, activeClub, isGlobalAdmin, loading, returnTo, loggedOut } = useAuth();
    // whether the start page of this login was already opened: set once a
    // page shows, so it is only the first page after logging in
    const startHandled = useRef(false);
    const location = useLocation();
    const { pathname } = location;
    useEffect(() => {
        startHandled.current = Boolean(user);
    }, [user]);

    // a new page starts at the top, e.g. a game after its long setup; going back
    // keeps where the browser was, and a link to a part of a page goes there
    const navigationType = useNavigationType();
    // which page came before, for the up links of the pages
    useEffect(() => {
        noteLocation(location, navigationType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);
    useEffect(() => {
        if (navigationType === 'POP' || window.location.hash) return;
        window.scrollTo(0, 0);
    }, [pathname, navigationType]);

    if (loading) return <PageLoader />;

    // Links from reset and invitation mails work whoever is logged in on this device
    if (pathname === '/reset-password') {
        return <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>;
    }

    if (!user) {
        return (
            <Suspense fallback={<PageLoader />}>
                <AppBanner />
                <InstallHint />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    {/* quick games without an account */}
                    <Route path="/quick" element={<QuickSetupPage />} />
                    <Route path="/quick/:kind/:id" element={<QuickGamePage />} />
                    <Route path="/quick/stats/:kind/:id" element={<QuickGamePage stats />} />
                    {/* after logging out: the public start page; otherwise the login */}
                    <Route path="*" element={<Navigate replace to={loggedOut ? '/' : '/login'} />} />
                </Routes>
            </Suspense>
        );
    }

    // logged in again after the session ran out: back to the page it ended on
    if (pathname === '/login' && returnTo) {
        return <Navigate replace to={returnTo} />;
    }

    // the start page the user chose, when the app opens on the dashboard after logging in
    if (!startHandled.current && user.startPage === 'myStatistics' && (pathname === '/' || pathname === '/login') && activeClub) {
        return <Navigate replace to="/me" />;
    }

    // Without a club there is nothing to play with yet: send the user to create one.
    // A global admin without a club of their own looks after the app instead.
    if (!activeClub && !CLUBLESS_PATHS.includes(pathname)) {
        return <Navigate replace to={isGlobalAdmin ? '/system-settings' : '/my-clubs'} />;
    }

    return (
        <div className="d-flex mb-5 mb-md-0">
            <AppNavigation />
            {/* warns before the session ends, and goes back to the login once it has */}
            <SessionWatch />
            {/* the banner sits on top of the pages, next to the menu */}
            <div className="app-content">
                <AppBanner />
                <InstallHint />
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
                    <Route path="/clock" element={<ClockConfigPage />} />
                    <Route path="/clock/:id" element={<ClockGamePage />} />
                    {/* Shanghai, Killer, … of the rules engine */}
                    <Route path="/play" element={<MoreGamesPage />} />
                    <Route path="/play/:kind" element={<RulesGameSetup />} />
                    <Route path="/play/:kind/:id" element={<RulesGame />} />
                    <Route path="/stats" element={<Navigate replace to="/stats/players" />} />
                    <Route path="/stats/:id" element={<StatsPage />} />
                    <Route path="/stats/games/:id" element={<GameListRedirect />} />
                    <Route path="/players" element={<ClubListsPage list="players" />} />
                    <Route path="/players/:id" element={<PlayerProfilePage />} />
                    <Route path="/players/:id/edit" element={<PlayerEditPage />} />
                    <Route path="/games" element={<ClubListsPage list="games" />} />
                    <Route path="/trainings" element={<ClubListsPage list="trainings" />} />
                    <Route path="/stats/games/x01/:id" element={<X01GameStats />} />
                    <Route path="/stats/games/cricket/:id" element={<CricketGameStats />} />
                    <Route path="/stats/games/elimination/:id" element={<EliminationGameStats />} />
                    <Route path="/stats/games/clock/:id" element={<ClockGameStats />} />
                    <Route path="/stats/games/:kind/:id" element={<RulesGameStats />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/training/atc" element={<TrainingPage />} />
                    <Route path="/training/x01" element={<X01BotPage />} />
                    {/* Bob's 27, 121 Checkout, … of the rules engine */}
                    <Route path="/training/more" element={<MoreGamesPage trainings />} />
                    <Route path="/training/:kind" element={<RulesTraining />} />
                    <Route path="/training/x01/:id" element={<X01GamePage training />} />
                    <Route path="/stats/training/x01/:id" element={<X01GameStats training />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/badges" element={<BadgesPage />} />
                    <Route path="/badges/:id" element={<BadgesPage />} />
                    <Route path="/my-clubs" element={<ClubsPage />} />
                    <Route path="/my-clubs/:id" element={<ClubEditPage />} />
                    {/* the old address of My clubs */}
                    <Route path="/clubs" element={<Navigate replace to="/my-clubs" />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/player-profile" element={<MyPlayerPage />} />
                    <Route path="/me" element={<MyStatistics />} />
                    <Route path="/system-settings" element={<AdministrationPage />} />
                    {/* the old address of the system settings */}
                    <Route path="/administration" element={<Navigate replace to="/system-settings" />} />
                    <Route path="/fair-play" element={<FairPlayPage />} />
                    <Route path="/admin/fair-play" element={<FairPlayPage all />} />
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