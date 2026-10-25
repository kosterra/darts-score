import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { GiDart } from "react-icons/gi";
import { MdQueryStats } from "react-icons/md";
import { FaPeopleGroup, FaRegClock, FaBullseye, FaUserGroup, FaMobileScreen, FaRobot, FaBookOpen, FaLanguage, FaWandMagicSparkles, FaScaleBalanced, FaPeopleArrows, FaTableCellsLarge, FaBell, FaPalette } from "react-icons/fa6";

import PublicService from '../../services/public.service';
import PublicGameCard from './public.game.card';
import PublicClubCard from './public.club.card';
import { ShowcaseShot, PhoneShot } from './showcase.shot';
import { locale, t } from '../../utils/i18n';
import { ContactLink, PublicHeader, PublicFooter } from './public.frame';
import usePageTitle from '../../utils/use.page.title';

const REFRESH_MS = 15 * 1000;

// what the app does, each with a screenshot of it, the picture left and right in turn
const SHOWCASE = [
    {
        eyebrow: t('Scoring'),
        title: t('Every dart counted, every way out shown'),
        text: t('Tap the darts on the board or the keypad, or type the score of a visit. Oche keeps the score of every player, shows the ways out from 170 down, and celebrates the 180s and the big finishes.'),
        points: [t('X01 from 101 to 1001, sets and legs, double in and out'), t('Cricket, Elimination, Around the Clock, Shanghai, Killer, Halve-It, Golf and Tactics'), t('Undo, handicaps and a guest for a single game'), t('The rules of every game one tap away')],
        shot: 'cricket-game',
        alt: t('A Cricket game in Oche: the marks of every player and the board to tap the darts on'),
    },
    {
        eyebrow: t('Statistics'),
        title: t('After the game, the story of the game'),
        text: t('Averages, checkout rates, score ranges and the darts per leg, compared side by side, with the moments that decided the match.'),
        points: [t('Every leg with its visits'), t('Where the darts landed, as a heatmap'), t('Head to head or side by side, in every game'), t('Play again with one tap')],
        shot: 'game-stats',
        alt: t('The statistics of an X01 game: the players, their figures side by side and the charts'),
    },
    {
        eyebrow: t('With friends'),
        title: t('A darts evening, with a table and awards'),
        text: t('Two to eight friends, game after game of X01, Cricket or Elimination, without an account. After every game the table of the evening, at the end the awards, from the champion to the wooden spoon.'),
        points: [t('The next game suggested, so everyone plays'), t('Who beat whom, and the form game by game'), t('Friends follow it live on their phones'), t('Make it a club later, with every game')],
        shot: 'darts-evening',
        alt: t('The table of a darts evening with five players, and the awards of the evening'),
    },
    {
        eyebrow: t('Your club'),
        title: t('The whole club at a glance'),
        text: t('Leaderboards, records, head-to-head, when the club plays and how its form develops. Club admins arrange the club\'s page for everyone, and every member has a Dashboard of their own. The pages of the games, trainings, players and badges show who plays, trains and collects most.'),
        points: [t('Leaderboards and club records'), t('Running games of the club, live'), t('Widgets to drag into place'), t('Who plays most, the club records of every training, the Hall of Shame')],
        shot: 'dashboard',
        alt: t('The club dashboard with leaderboards, records and the games per month'),
    },
    {
        eyebrow: t('Tournaments · beta'),
        title: t('Your own tournament, from club night to World Championship'),
        text: t('Club admins set up a knockout tournament for 8 to 64 players in a few clicks, starting from the formats of the PDC. Every member is invited and enters with one tap; the draw, the bracket and the next round take care of themselves.'),
        points: [t('Seeded by the club rating or drawn at random'), t('Every match a game of X01 with the rules of its round'), t('The bracket live, the winner goes on by itself'), t('Invitations and reminders in the app and by mail')],
        shot: 'tournament',
        alt: t('The bracket of a tournament: the last 16 played, the quarter-finals going on'),
    },
    {
        eyebrow: t('Progress'),
        title: t('Levels, badges and darts to collect'),
        text: t('Every game earns experience: from Beginner to Legend, with an average level for X01. Badges mark the milestones, and flight points unlock flights and barrels for your own darts.'),
        points: [t('Player levels and average levels'), t('Badges for 180s, big checkouts and streaks'), t('Club badges and goals, earned together'), t('17 flight shapes, 40 designs, 13 barrels')],
        shot: 'player-stats',
        alt: t('The statistics of a player: level, averages and form over time'),
    },
];

// the ways in, from trying it out to a club of your own
const WAYS = [
    {
        to: '/quick', icon: <FaBullseye />, eyebrow: t('Try it out'), buttonIcon: 'pi pi-play', action: t('Play a quick game'),
        question: t('Just want to see how Oche works, or play a few games without keeping statistics?'),
        points: [t('No account, only the names of the players'), t('X01, Cricket or Elimination for up to four'), t('The statistics of the game at the end')],
    },
    {
        to: '/evening/new', icon: <FaUserGroup />, eyebrow: t('With friends'), buttonIcon: 'pi pi-users', action: t('Start a darts evening'),
        question: t('Together with friends for a good darts night, with some statistics at the end?'),
        points: [t('No account, up to eight players'), t('A table of the evening, awards and who beat whom'), t('Friends follow it on their phones')],
    },
    {
        to: '/register', icon: <FaPeopleGroup />, eyebrow: t('Your club'), buttonIcon: 'pi pi-arrow-right', action: t('Create an account and your club'), main: true,
        question: t('A club, a pub team or a group that plays darts regularly?'),
        points: [t('Statistics, records and head to head over time'), t('Levels, badges, trainings and tournaments'), t('A login for every player, free and without ads')],
    },
];

const FEATURES = [
    { icon: <FaBullseye />, title: t('Nine games'), text: t('X01, Cricket, Elimination and Around the Clock, plus Shanghai, Killer, Halve-It, Golf and Tactics, for one to four players.') },
    { icon: <MdQueryStats />, title: t('Statistics that mean something'), text: t('Averages, checkout rates and head-to-head for every player and game.') },
    { icon: <FaRegClock />, title: t('Training'), text: t('Around the Clock against the stopwatch, X01 against a bot as strong as you, and six more trainings from Bob\'s 27 to Catch 40.') },
    { icon: <FaRobot />, title: t('A bot to practise with'), text: t('Easy, normal, hard or pro, or one that plays at your own level.') },
    { icon: <FaPeopleGroup />, title: t('Made for clubs'), text: t('Several admins, a login for every player, and new members who join on their own if you let them.') },
    { icon: <FaUserGroup />, title: t('Friends and family too'), text: t('Your own group for friends, the flatshare or the family, and a guest for a single game in seconds.') },
    { icon: <FaMobileScreen />, title: t('On any screen'), text: t('Phone, tablet or the PC next to the board: nothing to install, or add Oche to the home screen as an app.') },
    { icon: <FaBookOpen />, title: t('Rules at hand'), text: t('Every game and training explains its rules, in its setup and while it is played.') },
    { icon: <FaWandMagicSparkles />, title: t('The big moments celebrated'), text: t('180s, big finishes, a Shanghai or a hole in one, and the winner in gold, without holding up the next game.') },
    { icon: <FaLanguage />, title: t('In five languages'), text: t('English, German, French, Italian and Spanish; the darts terms stay English.') },
    { icon: <FaScaleBalanced />, title: t('Fair play'), text: t('Oche checks every game for scores that cannot be thrown; a game entered by mistake goes when its players agree, or a club admin decides.') },
    { icon: <FaPeopleArrows />, title: t('Who beats whom'), text: t('Compare two to four players in any game: the score of wins, the streaks, the highlights of their duels and, from the club rating, the chances for the next game.') },
    { icon: <FaTableCellsLarge />, title: t('A Dashboard of your own'), text: t('What waits for you, your favourite games started again with one tap, your training and your form, arranged as you like.') },
    { icon: <FaBell />, title: t('Nothing missed'), text: t('Badges, records, tournaments and requests in the app or by mail, at once, daily or weekly, and your week on Mondays: you choose.') },
    { icon: <FaPalette />, title: t('Your look'), text: t('Dark, light, pure black for OLED screens or high contrast, in the colour of your club or your own.') },
    { icon: <GiDart />, title: t('You decide what is public'), text: t('Clubs are private unless their admins open them up, and every player chooses whether their name is shown.') },
];

const STEPS = [
    { title: t('Create your account'), text: t('Register with your email address. It takes a minute.') },
    { title: t('Set up your group or join a club'), text: t('Set up a club for your team, your friends or your flatshare and add the players, or find a club that takes new members and join it.') },
    { title: t('Play'), text: t('Start a game, throw, and let Oche do the counting. Or try a quick game first, without an account.') },
];

const FAQ = [
    { q: t('Is Oche only for clubs?'), a: t('No. In Oche every group is a "club": a darts club or pub team as well as friends, a flatshare or the family. Set one up in a minute, add the players, and play.') },
    { q: t('What does Oche cost?'), a: t('Nothing. Oche is free for everyone, without ads.') },
    { q: t('Can I try it without an account?'), a: t('Yes: a quick game of X01, Cricket or Elimination needs only the names of the players, and ends with its statistics; a darts evening plays game after game with up to eight, with a table of the evening and awards. Both stay on your device for 30 days; an account keeps every game, and an evening can become a club.') },
    { q: t('Do we need to know the rules?'), a: t('No. Every game and training has its rules one tap away, when setting it up and while playing, and Oche counts by them.') },
    { q: t('Which languages does Oche speak?'), a: t('English, German, French, Italian and Spanish. It starts in the language of your browser, and your account remembers your choice. The darts terms stay English: leg, set, bust, checkout.') },
    { q: t('Who sees our games?'), a: t('Only the members of your club or group. A club appears on this page only when its admins make it public, and even then a player is only named when they chose to show their nickname.') },
    { q: t('Do I need a dartboard with electronics?'), a: t('No. Oche is for steel and soft tip on any board: you enter the darts on the phone, tablet or PC next to it.') },
    { q: t('Can a player be in more than one club?'), a: t('Yes. One account plays in several clubs, with one player whose statistics, badges and darts go along.') },
    { q: t('Can we play tournaments?'), a: t('Yes, as a beta: club admins set up knockout tournaments for 8 to 64 players with a date and rules for every round. The members enter with one tap, also from the invitation mail, and the bracket shows every match live.') },
    { q: t('What do leg, bust or Madhouse mean?'), a: <>{t('The basics of the game and every term you hear at the oche, explained in your language:')}{' '}<Link to="/darts-terms">{t('Darts A–Z')}</Link>.</> },
    { q: t('Found a problem, or have an idea?'), a: <>{t('Tell us, every message is read:')}{' '}<ContactLink>{t('Contact')}</ContactLink>. {t('What changed lately is under')}{' '}<Link to="/whats-new">{t('What\'s new')}</Link>.</> },
    { q: t('Can we run Oche ourselves?'), a: t('Yes. Oche is open source under the GPLv3 and runs with Docker on your own server.') },
];

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

/**
 * The public start page: what Oche is, with pictures of it, the running
 * games and latest results and the clubs of the installation that are public.
 */
const LandingPage = () => {
    usePageTitle(`Oche – ${t('The darts scoreboard')}`, { full: true });
    const [overview, setOverview] = useState(null);
    // a section asked for from another page (/#faq): there, and kept there while the
    // clubs, results and pictures above it come in and push it down, until the
    // visitor scrolls on their own
    const { hash } = useLocation();
    useEffect(() => {
        if (!hash) return undefined;
        const target = () => document.getElementById(hash.slice(1));
        const go = () => target()?.scrollIntoView({ block: 'start' });
        const observer = new ResizeObserver(go);
        observer.observe(document.body);
        const stop = () => { observer.disconnect(); clearTimeout(timer); ['wheel', 'touchstart', 'keydown'].forEach(name => window.removeEventListener(name, stop)); };
        ['wheel', 'touchstart', 'keydown'].forEach(name => window.addEventListener(name, stop, { passive: true }));
        const timer = setTimeout(stop, 2500);
        go();
        return stop;
    }, [hash]);

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
            <PublicHeader nav={
                <nav className="landing-nav" aria-label={t('Sections')}>
                    <a href="#features">{t('Features')}</a>
                    {clubs.length > 0 && <a href="#clubs">{t('Clubs')}</a>}
                    {(liveGames.length > 0 || results.length > 0) && <a href="#live">{liveGames.length > 0 ? t('Live') : t('Results')}</a>}
                    <a href="#faq">{t('FAQ')}</a>
                    <Link to="/darts-terms">{t('Darts A–Z')}</Link>
                </nav>
            } />
            <div className="landing-hero">

                <section className="container landing-hero-content">
                    <div className="row align-items-center gy-5">
                        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
                            <span className="landing-eyebrow">{t('Free darts scoring for everyone – clubs, friends, flatshares')}</span>
                            <h1 className="landing-title m-0">{t('Game on. We keep the score.')}</h1>
                            <p className="fs-5 text-default m-0">
                                {t('Oche is the scoreboard for your club, your pub team, your flatshare or your living room: it counts every dart, keeps the statistics and shows who is on the oche right now.')}
                            </p>
                            <div className="d-flex flex-wrap gap-3 pt-2">
                                <Link to="/register"><Button label={t('Get started')} icon="pi pi-arrow-right" iconPos="right" size="large" /></Link>
                                <Link to="/quick"><Button label={t('Play a quick game')} icon="pi pi-play" size="large" outlined /></Link>
                            </div>
                            <ul className="landing-ticks">
                                <li><i className="pi pi-check" aria-hidden="true" />{t('Free')}</li>
                                <li><i className="pi pi-check" aria-hidden="true" />{t('Open source')}</li>
                                <li><i className="pi pi-check" aria-hidden="true" />{t('Phone, tablet and PC')}</li>
                            </ul>
                        </div>
                        <div className="col-12 col-lg-7">
                            <div className="landing-hero-shots">
                                <ShowcaseShot name="x01-game" alt={t('An X01 game in Oche: the scores, the ways out and the board to tap the darts on')} eager />
                                <PhoneShot name="x01-game-phone" alt={t('The same X01 game on a phone')} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <main className="d-flex flex-column landing-main">
                {/* the numbers only once the global admins show them */}
                {overview?.totals &&
                    <section className="container" aria-label={t('Oche in numbers')}>
                        <div className="landing-numbers">
                            {[[t('Clubs'), overview.totals.clubs], [t('Players'), overview.totals.players], [t('Games played'), overview.totals.gamesPlayed], [t('Games this week'), overview.totals.gamesThisWeek]].map(([label, value]) => (
                                <div key={label}>
                                    <div className="landing-number">{formatNumber(value)}</div>
                                    <div className="text-subtle fs-7">{label}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                }

                {/* three ways in: a game to try, an evening with friends, or a club */}
                <section id="start" className="container d-flex flex-column gap-4">
                    <div className="landing-section-head">
                        <span className="landing-eyebrow">{t('Three ways to play')}</span>
                        <h2 className="landing-heading m-0">{t('What is right for you?')}</h2>
                    </div>
                    <div className="landing-ways">
                        {WAYS.map(way => (
                            <div key={way.to} className={`landing-way${way.main ? ' is-main' : ''}`}>
                                <span className="landing-feature-icon" aria-hidden="true">{way.icon}</span>
                                <span className="landing-eyebrow">{way.eyebrow}</span>
                                <h3 className="fs-5 fw-semibold text-default m-0">{way.question}</h3>
                                <ul className="landing-way-points">
                                    {way.points.map(point => <li key={point}><i className="pi pi-check" aria-hidden="true" />{point}</li>)}
                                </ul>
                                <Link to={way.to} className="mt-auto">
                                    <Button label={way.action} icon={way.buttonIcon} iconPos="right" className="w-100" outlined={!way.main} />
                                </Link>
                            </div>
                        ))}
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
                        <span className="landing-eyebrow">{t('And much more')}</span>
                        <h2 className="landing-heading m-0">{t('Everything a darts evening needs')}</h2>
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
                            <span className="landing-eyebrow">{t('On the oche')}</span>
                            <h2 className="landing-heading m-0">{liveGames.length > 0 ? t('Live now') : t('Latest results')}</h2>
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
                            {liveGames.length > 0 && <h3 className="fs-5 fw-semibold text-default m-0 pt-2">{t('Latest results')}</h3>}
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
                            <span className="landing-eyebrow">{t('Playing with Oche')}</span>
                            <h2 className="landing-heading m-0">{t('Public clubs')}</h2>
                            <p className="text-subtle m-0">{t('Clubs that show themselves here, with what they played. Some take new members: register and join them.')}</p>
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
                        <span className="landing-eyebrow">{t('Get going')}</span>
                        <h2 className="landing-heading m-0">{t('Start in three steps')}</h2>
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
                        <span className="landing-eyebrow">{t('Questions')}</span>
                        <h2 className="landing-heading m-0">{t('Good to know')}</h2>
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
                        <h2 className="landing-heading m-0">{t('Ready for the first leg?')}</h2>
                        <p className="text-subtle m-0">{t('Set up your club or group, or join one, today. It is free.')}</p>
                        <Link to="/register"><Button label={t('Get started')} icon="pi pi-arrow-right" iconPos="right" size="large" /></Link>
                        <span className="text-faint fs-8">{t('Free and without ads. Enjoying it?')}{' '}<Link to="/support">{t('Support Oche')}</Link></span>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
};

export default LandingPage;
