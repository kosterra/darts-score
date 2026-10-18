import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { GiDart } from "react-icons/gi";
import { MdQueryStats } from "react-icons/md";
import { FaPeopleGroup, FaRegClock, FaBullseye, FaUserGroup } from "react-icons/fa6";

import PublicService from '../../services/public.service';
import PublicGameCard from './public.game.card';
import ClubLogo from '../elements/club.logo';

const REFRESH_MS = 15 * 1000;

const FEATURES = [
    { icon: <FaBullseye />, title: 'X01, Cricket, Elimination and Around the Clock', text: 'Score the classic games for one to four players, on a dartboard you tap or by typing the darts.' },
    { icon: <MdQueryStats />, title: 'Statistics that mean something', text: 'Averages, checkout rates, score ranges and head-to-head comparisons for every player and game.' },
    { icon: <FaRegClock />, title: 'Training', text: 'Practise Around the Clock against the stopwatch and watch your best times improve.' },
    { icon: <FaPeopleGroup />, title: 'Made for clubs', text: 'Run your club with several admins. Players get their own login to play and train whenever they like.' },
    { icon: <FaUserGroup />, title: 'Friends and family too', text: 'Create a second club for the people at home, and add a guest for a single game in seconds.' },
    { icon: <GiDart />, title: 'You decide what is public', text: 'Clubs are private unless their admin opens them up, and every player chooses whether their name is shown.' },
];

const STEPS = [
    { title: 'Create your account', text: 'Register with your email address. It takes a minute.' },
    { title: 'Set up your club', text: 'Name your club, add your players and invite further admins.' },
    { title: 'Play', text: 'Start a game, throw, and let Oche do the counting.' },
];

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

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
            <div className="landing-hero">
                <header className="d-flex justify-content-between align-items-center gap-3 px-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                        <img alt="" src="/logo.svg" width="48" height="48" />
                        <span className="fs-5 fw-semibold text-default">Oche</span>
                    </div>
                    <nav className="d-flex gap-2" aria-label="Account">
                        <Link to="/login"><Button label="Log in" size="small" outlined /></Link>
                        <Link to="/register"><Button label="Register" size="small" /></Link>
                    </nav>
                </header>

                <section className="container py-5">
                    <div className="row py-lg-5">
                        <div className="col-12 col-lg-8 col-xl-7 d-flex flex-column gap-3">
                            <h1 className="display-4 fw-semibold text-default m-0">Game on. We keep the score.</h1>
                            <p className="fs-5 text-default m-0">
                                Oche is the scoreboard for your club, your pub team or your living room: it counts every dart,
                                keeps the statistics and shows who is on the oche right now.
                            </p>
                            <div className="d-flex flex-wrap gap-3 pt-2">
                                <Link to="/register"><Button label="Create your club" icon="pi pi-user-plus" size="large" /></Link>
                                <Link to="/login"><Button label="Log in" icon="pi pi-sign-in" size="large" outlined /></Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <main className="container pb-5 d-flex flex-column gap-5">
                {overview &&
                    <section className="row gy-3 text-center" aria-label="Oche in numbers">
                        {[['Clubs', overview.totals.clubs], ['Players', overview.totals.players], ['Games played', overview.totals.gamesPlayed]].map(([label, value]) => (
                            <div className="col-12 col-md-4" key={label}>
                                <div className="bg-surface-translucent rounded-2 py-4">
                                    <div className="display-5 fw-semibold text-default" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(value)}</div>
                                    <div className="text-subtle">{label}</div>
                                </div>
                            </div>
                        ))}
                    </section>
                }

                <section className="d-flex flex-column gap-3">
                    <h2 className="fs-3 fw-semibold text-default m-0">Live now</h2>
                    {liveGames.length === 0
                        ? <p className="text-subtle m-0">No public games are running at the moment. Scores appear here as soon as a public club starts playing.</p>
                        : (
                            <div className="row gy-4">
                                {liveGames.map(game => (
                                    <div className="col-12 col-md-6 col-xl-4" key={game.id}>
                                        <PublicGameCard game={game} live />
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </section>

                {results.length > 0 &&
                    <section className="d-flex flex-column gap-3">
                        <h2 className="fs-3 fw-semibold text-default m-0">Latest results</h2>
                        <div className="row gy-4">
                            {results.map(game => (
                                <div className="col-12 col-md-6 col-xl-4" key={game.id}>
                                    <PublicGameCard game={game} />
                                </div>
                            ))}
                        </div>
                    </section>
                }

                <section className="d-flex flex-column gap-3">
                    <h2 className="fs-3 fw-semibold text-default m-0">What you get</h2>
                    <div className="row gy-4">
                        {FEATURES.map(feature => (
                            <div className="col-12 col-md-6 col-xl-4" key={feature.title}>
                                <div className="bg-surface-translucent rounded-2 p-4 h-100 d-flex flex-column gap-2">
                                    <span className="fs-3 text-primary">{feature.icon}</span>
                                    <h3 className="fs-5 fw-semibold text-default m-0">{feature.title}</h3>
                                    <p className="text-subtle m-0">{feature.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="d-flex flex-column gap-3">
                    <h2 className="fs-3 fw-semibold text-default m-0">Start in three steps</h2>
                    <ol className="row gy-4 list-unstyled m-0 p-0">
                        {STEPS.map((step, idx) => (
                            <li className="col-12 col-md-4" key={step.title}>
                                <div className="d-flex gap-3">
                                    <span className="display-6 fw-semibold text-primary" aria-hidden="true">{idx + 1}</span>
                                    <div className="d-flex flex-column gap-1">
                                        <h3 className="fs-5 fw-semibold text-default m-0">{step.title}</h3>
                                        <p className="text-subtle m-0">{step.text}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                {clubs.length > 0 &&
                    <section className="d-flex flex-column gap-3">
                        <h2 className="fs-3 fw-semibold text-default m-0">Public clubs</h2>
                        <div className="d-flex flex-wrap gap-2">
                            {clubs.map(club => (
                                <span key={club.name} className="bg-surface-raised rounded-pill ps-1 pe-3 py-1 text-default d-inline-flex align-items-center gap-2">
                                    <ClubLogo club={club} className="rounded-circle" />
                                    {club.name} <span className="text-faint fs-8">· {club.playerCount} {club.playerCount === 1 ? 'player' : 'players'}</span>
                                </span>
                            ))}
                        </div>
                    </section>
                }

                <section className="bg-surface-translucent rounded-2 p-4 p-md-5 d-flex flex-column align-items-center text-center gap-3">
                    <h2 className="fs-3 fw-semibold text-default m-0">Ready for the first leg?</h2>
                    <p className="text-subtle m-0">Set up your club today. It is free.</p>
                    <Link to="/register"><Button label="Create your club" icon="pi pi-user-plus" size="large" /></Link>
                </section>
            </main>

            <footer className="text-center text-faint fs-8 py-4">
                Oche · open source under the GPLv3
            </footer>
        </div>
    );
};

export default LandingPage;
