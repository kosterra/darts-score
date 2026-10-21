import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { GiDart } from "react-icons/gi";
import { MdQueryStats } from "react-icons/md";
import { FaPeopleGroup, FaRegClock, FaBullseye, FaUserGroup, FaMobileScreen, FaRobot } from "react-icons/fa6";

import PublicService from '../../services/public.service';
import PublicGameCard from './public.game.card';
import PublicClubCard from './public.club.card';
import { ShowcaseShot, PhoneShot } from './showcase.shot';

const REFRESH_MS = 15 * 1000;

// what the app does, each with a screenshot of it, the picture left and right in turn
const SHOWCASE = [
    {
        eyebrow: 'Scoring',
        title: 'Every dart counted, every way out shown',
        text: 'Tap the darts on the board or the keypad, or type the score of a visit. Oche keeps the score of every player, shows the ways out from 170 down, and celebrates the 180s and the big finishes.',
        points: ['X01 from 101 to 1001, sets and legs, double in and out', 'Cricket, Elimination and Around the Clock', 'Undo, handicaps and a guest for a single game'],
        shot: 'cricket-game',
        alt: 'A Cricket game in Oche: the marks of every player and the board to tap the darts on',
    },
    {
        eyebrow: 'Statistics',
        title: 'After the game, the story of the game',
        text: 'Averages, checkout rates, score ranges and the darts per leg, compared side by side, with the moments that decided the match.',
        points: ['Every leg with its visits', 'Where the darts landed, as a heatmap', 'Play again with one tap'],
        shot: 'game-stats',
        alt: 'The statistics of an X01 game: the players, their figures side by side and the charts',
    },
    {
        eyebrow: 'Your club',
        title: 'The whole club at a glance',
        text: 'Leaderboards, records, head-to-head, when the club plays and how its form develops. Club admins arrange the dashboard, every member can make their own.',
        points: ['Leaderboards and club records', 'Running games of the club, live', 'Widgets to drag into place'],
        shot: 'dashboard',
        alt: 'The club dashboard with leaderboards, records and the games per month',
    },
    {
        eyebrow: 'Progress',
        title: 'Levels, badges and darts to collect',
        text: 'Every game earns experience: from Beginner to Legend, with an average level for X01. Badges mark the milestones, and flight points unlock flights and barrels for your own darts.',
        points: ['Player levels and average levels', 'Badges for 180s, big checkouts and streaks', '17 flight shapes, 40 designs, 13 barrels'],
        shot: 'player-stats',
        alt: 'The statistics of a player: level, averages and form over time',
    },
];

const FEATURES = [
    { icon: <FaBullseye />, title: 'Four classic games', text: 'X01, Cricket, Elimination and Around the Clock for one to four players.' },
    { icon: <MdQueryStats />, title: 'Statistics that mean something', text: 'Averages, checkout rates and head-to-head for every player and game.' },
    { icon: <FaRegClock />, title: 'Training', text: 'Around the Clock against the stopwatch, and X01 against a bot as strong as you.' },
    { icon: <FaRobot />, title: 'A bot to practise with', text: 'Easy, normal, hard or pro, or one that plays at your own level.' },
    { icon: <FaPeopleGroup />, title: 'Made for clubs', text: 'Several admins, a login for every player, and new members who join on their own if you let them.' },
    { icon: <FaUserGroup />, title: 'Friends and family too', text: 'A second club for the people at home, and a guest for a single game in seconds.' },
    { icon: <FaMobileScreen />, title: 'On any screen', text: 'Phone, tablet or the PC next to the board: nothing to install.' },
    { icon: <GiDart />, title: 'You decide what is public', text: 'Clubs are private unless their admins open them up, and every player chooses whether their name is shown.' },
];

const STEPS = [
    { title: 'Create your account', text: 'Register with your email address. It takes a minute.' },
    { title: 'Set up or join a club', text: 'Name your own club and add your players, or find a club that takes new members and join it.' },
    { title: 'Play', text: 'Start a game, throw, and let Oche do the counting. Or try a quick game first, without an account.' },
];

const FAQ = [
    { q: 'What does Oche cost?', a: 'Nothing. Oche is free for clubs and players, without ads.' },
    { q: 'Can I try it without an account?', a: 'Yes: a quick game of X01 or Cricket needs only the names of the players, and ends with its statistics. It stays on your device for 30 days; an account keeps every game.' },
    { q: 'Who sees our games?', a: 'Only the members of your club. A club appears on this page only when its admins make it public, and even then a player is only named when their nickname is set to public.' },
    { q: 'Do I need a dartboard with electronics?', a: 'No. Oche is for steel and soft tip on any board: you enter the darts on the phone, tablet or PC next to it.' },
    { q: 'Can a player be in more than one club?', a: 'Yes. One account plays in several clubs, with one player whose statistics, badges and darts go along.' },
    { q: 'Can we run Oche ourselves?', a: 'Yes. Oche is open source under the GPLv3 and runs with Docker on your own server.' },
];

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

/**
 * The public start page: what Oche is, with pictures of it, the running
 * games and latest results and the clubs of the installation that are public.
 */
const LandingPage = () => {
    const [overview, setOverview] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await PublicService.loadOverview();
                if (!cancelled) setOverview(data);
            } catch (error) {
                console.error('Failed to load the public overview', error);
            }
        };
        load();
        // live scores: keep the page current while it is open
        const timer = setInterval(load, REFRESH_MS);
        return () => { cancelled = true; clearInterval(timer); };
    }, []);

    const liveGames = overview?.liveGames ?? [];
    const results = overview?.results ?? [];
    const clubs = overview?.clubs ?? [];

    return (
        <div className="landing container-fluid p-0">
            <header className="landing-bar">
                <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
                    <img alt="" src="/logo.svg" width="40" height="40" />
                    <span className="fs-5 fw-semibold text-default">Oche</span>
                </Link>
                <nav className="landing-nav" aria-label="Sections">
                    <a href="#features">Features</a>
                    {clubs.length > 0 && <a href="#clubs">Clubs</a>}
                    {(liveGames.length > 0 || results.length > 0) && <a href="#live">{liveGames.length > 0 ? 'Live' : 'Results'}</a>}
                    <a href="#faq">FAQ</a>
                </nav>
                <nav className="d-flex gap-2" aria-label="Account">
                    <Link to="/login"><Button label="Log in" size="small" outlined /></Link>
                    <Link to="/register"><Button label="Register" size="small" /></Link>
                </nav>
            </header>
            <div className="landing-hero">

                <section className="container landing-hero-content">
                    <div className="row align-items-center gy-5">
                        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
                            <span className="landing-eyebrow">Free darts scoring for clubs</span>
                            <h1 className="landing-title m-0">Game on. We keep the score.</h1>
                            <p className="fs-5 text-default m-0">
                                Oche is the scoreboard for your club, your pub team or your living room: it counts every dart,
                                keeps the statistics and shows who is on the oche right now.
                            </p>
                            <div className="d-flex flex-wrap gap-3 pt-2">
                                <Link to="/register"><Button label="Get started" icon="pi pi-arrow-right" iconPos="right" size="large" /></Link>
                                <Link to="/quick"><Button label="Play a quick game" icon="pi pi-play" size="large" outlined /></Link>
                            </div>
                            <ul className="landing-ticks">
                                <li><i className="pi pi-check" aria-hidden="true" />Free</li>
                                <li><i className="pi pi-check" aria-hidden="true" />Open source</li>
                                <li><i className="pi pi-check" aria-hidden="true" />Phone, tablet and PC</li>
                            </ul>
                        </div>
                        <div className="col-12 col-lg-7">
                            <div className="landing-hero-shots">
                                <ShowcaseShot name="x01-game" alt="An X01 game in Oche: the scores, the ways out and the board to tap the darts on" eager />
                                <PhoneShot name="x01-game-phone" alt="The same X01 game on a phone" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <main className="d-flex flex-column landing-main">
                {/* the numbers only once the global admins show them */}
                {overview?.totals &&
                    <section className="container" aria-label="Oche in numbers">
                        <div className="landing-numbers">
                            {[['Clubs', overview.totals.clubs], ['Players', overview.totals.players], ['Games played', overview.totals.gamesPlayed], ['Games this week', overview.totals.gamesThisWeek]].map(([label, value]) => (
                                <div key={label}>
                                    <div className="landing-number">{formatNumber(value)}</div>
                                    <div className="text-subtle fs-7">{label}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                }

                <section className="container">
                    <div className="landing-quick">
                        <div className="d-flex flex-column gap-1">
                            <span className="landing-eyebrow">No account needed</span>
                            <h2 className="fs-4 fw-semibold text-default m-0">Throw a few darts right now</h2>
                            <p className="text-subtle m-0">
                                X01 or Cricket for up to four players, who only need a name: the full scoreboard with the ways out, and the statistics of the game at the end.
                            </p>
                        </div>
                        <Link to="/quick"><Button label="Play a quick game" icon="pi pi-play" size="large" /></Link>
                    </div>
                </section>

                <section id="features" className="container d-flex flex-column landing-showcase">
                    {SHOWCASE.map((item, index) => (
                        <article key={item.shot} className={`row align-items-center gy-4 ${index % 2 ? 'flex-lg-row-reverse' : ''}`}>
                            <div className="col-12 col-lg-5 d-flex flex-column gap-3">
                                <span className="landing-eyebrow">{item.eyebrow}</span>
                                <h2 className="landing-heading m-0">{item.title}</h2>
                                <p className="text-subtle m-0">{item.text}</p>
                                <ul className="landing-points">
                                    {item.points.map(point => <li key={point}><i className="pi pi-check" aria-hidden="true" />{point}</li>)}
                                </ul>
                            </div>
                            <div className="col-12 col-lg-7">
                                <ShowcaseShot name={item.shot} alt={item.alt} />
                            </div>
                        </article>
                    ))}
                </section>

                <section className="container d-flex flex-column gap-4">
                    <div className="landing-section-head">
                        <span className="landing-eyebrow">And much more</span>
                        <h2 className="landing-heading m-0">Everything a darts evening needs</h2>
                    </div>
                    <div className="row g-3">
                        {FEATURES.map(feature => (
                            <div className="col-12 col-sm-6 col-xl-3" key={feature.title}>
                                <div className="landing-feature">
                                    <span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span>
                                    <h3 className="fs-6 fw-semibold text-default m-0">{feature.title}</h3>
                                    <p className="text-subtle fs-7 m-0">{feature.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* only what is there: running games, the latest results, or nothing at all */}
                {(liveGames.length > 0 || results.length > 0) &&
                    <section id="live" className="container d-flex flex-column gap-4">
                        <div className="landing-section-head">
                            <span className="landing-eyebrow">On the oche</span>
                            <h2 className="landing-heading m-0">{liveGames.length > 0 ? 'Live now' : 'Latest results'}</h2>
                        </div>
                        {liveGames.length > 0 &&
                            <div className="row g-4">
                                {liveGames.map(game => (
                                    <div className="col-12 col-md-6 col-xl-4" key={game.id}>
                                        <PublicGameCard game={game} live />
                                    </div>
                                ))}
                            </div>
                        }
                        {results.length > 0 && <>
                            {liveGames.length > 0 && <h3 className="fs-5 fw-semibold text-default m-0 pt-2">Latest results</h3>}
                            <div className="row g-4">
                                {results.map(game => (
                                    <div className="col-12 col-md-6 col-xl-4" key={game.id}>
                                        <PublicGameCard game={game} />
                                    </div>
                                ))}
                            </div>
                        </>}
                    </section>
                }

                {clubs.length > 0 &&
                    <section id="clubs" className="container d-flex flex-column gap-4">
                        <div className="landing-section-head">
                            <span className="landing-eyebrow">Playing with Oche</span>
                            <h2 className="landing-heading m-0">Public clubs</h2>
                            <p className="text-subtle m-0">Clubs that show themselves here, with what they played. Some take new members: register and join them.</p>
                        </div>
                        <div className="row g-4">
                            {clubs.map(club => (
                                <div className="col-12 col-md-6 col-xl-4" key={club.name}>
                                    <PublicClubCard club={club} />
                                </div>
                            ))}
                        </div>
                    </section>
                }

                <section className="container d-flex flex-column gap-4">
                    <div className="landing-section-head">
                        <span className="landing-eyebrow">Get going</span>
                        <h2 className="landing-heading m-0">Start in three steps</h2>
                    </div>
                    <ol className="row g-3 list-unstyled m-0 p-0">
                        {STEPS.map((step, idx) => (
                            <li className="col-12 col-md-4" key={step.title}>
                                <div className="landing-step">
                                    <span className="landing-step-number" aria-hidden="true">{idx + 1}</span>
                                    <div className="d-flex flex-column gap-1">
                                        <h3 className="fs-5 fw-semibold text-default m-0">{step.title}</h3>
                                        <p className="text-subtle m-0">{step.text}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="faq" className="container d-flex flex-column gap-4">
                    <div className="landing-section-head">
                        <span className="landing-eyebrow">Questions</span>
                        <h2 className="landing-heading m-0">Good to know</h2>
                    </div>
                    <div className="landing-faq">
                        {FAQ.map(item => (
                            <details key={item.q}>
                                <summary>{item.q}</summary>
                                <p className="text-subtle m-0">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="container">
                    <div className="landing-cta">
                        <h2 className="landing-heading m-0">Ready for the first leg?</h2>
                        <p className="text-subtle m-0">Set up your club, or join one, today. It is free.</p>
                        <Link to="/register"><Button label="Get started" icon="pi pi-arrow-right" iconPos="right" size="large" /></Link>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <span>Oche · open source under the GPLv3</span>
                <span className="d-flex gap-3">
                    <Link to="/login">Log in</Link>
                    <Link to="/register">Register</Link>
                </span>
            </footer>
        </div>
    );
};

export default LandingPage;
