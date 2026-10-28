import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import StatsService from '../../services/stats.service';
import { useAuth } from '../../utils/auth.context';
import { playerInClub, useMyPlayers } from '../../utils/use.my.players';
import { locale, t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { shareCard } from '../../utils/share.card';
import { KpiChip, KpiHero } from '../stats/players/kpi';
import { FaBullseye, FaCalendarDays, FaCrosshairs, FaFire, FaHashtag, FaStopwatch, FaUserGroup } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { PiClockClockwiseBold } from 'react-icons/pi';
import { rulesIcon } from '../rules/rules.icons';
import BadgeMedal from '../badges/badge.medal';
import { gameTitle } from '../admin/kind.titles';
import { Lines } from '../elements/skeletons';
import { ACCENT, GAME_COLORS } from '../../utils/palette';
import usePageTitle from '../../utils/use.page.title';
import { defaultYear } from '../../utils/year.in.darts';

const monthName = (month) => new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month - 1, 15)));
const number = (value, digits = 0) => (value == null ? '–' : new Intl.NumberFormat(locale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value));

/**
 * "Your year in darts": a player's year at a glance, for the look back each
 * December — the games and wins, the X01 records, the busiest month, the
 * rival, the trainings and badges — and a picture of it to share. Opens on
 * the player's own (from the menu and the dashboard) or on any player.
 */
const YearPage = () => {
    const { id } = useParams();
    const [params, setParams] = useSearchParams();
    const { activeClub } = useAuth();
    const myPlayers = useMyPlayers(!id);
    const mine = playerInClub(myPlayers, activeClub?.id);
    const playerId = id ?? mine?.id;
    const year = Number(params.get('year')) || defaultYear();
    const [review, setReview] = useState(null);
    const [error, setError] = useState('');
    const [sharing, setSharing] = useState(false);
    const toast = useRef(null);
    usePageTitle(t('Year in darts {{year}}', { year }));

    useEffect(() => {
        if (!playerId) return;
        setReview(null);
        StatsService.loadYear(playerId, year).then(setReview).catch(err => setError(err.message));
    }, [playerId, year]);

    // without a player of one's own in this club there is no year of one's own
    if (!id && myPlayers && !mine) return <Navigate replace to="/" />;
    if (error) return <div className="container-fluid p-4"><Message severity="error" text={error} /></div>;
    if (!review) return <div className="container-fluid p-4"><Lines count={8} /></div>;

    const own = !id || id === mine?.id;
    const nothing = review.games.total === 0;
    const x01 = review.x01;
    const opponentLine = review.opponent && t('{{games}} games · {{wins}} won', { games: review.opponent.games, wins: review.opponent.wins });

    const share = async () => {
        setSharing(true);
        try {
            const figures = [
                { value: number(review.games.wins), label: t('wins') },
                ...(x01?.average ? [{ value: number(x01.average, 1), label: t('3-dart average') }] : []),
                ...(x01?.oneEighties ? [{ value: number(x01.oneEighties), label: t('180s') }] : []),
                ...(x01?.highestCheckout ? [{ value: number(x01.highestCheckout), label: t('Highest checkout') }] : []),
                { value: number(review.days), label: t('days at the board') },
                ...(review.badges.count ? [{ value: number(review.badges.count), label: t('badges') }] : []),
            ];
            const result = await shareCard({
                eyebrow: t('Year in darts {{year}}', { year: review.year }),
                title: review.player.nickname,
                subtitle: activeClub?.name ?? '',
                hero: { value: number(review.games.total), label: tn(review.games.total, 'game played', 'games played') },
                figures,
            }, { filename: `legmate-${review.year}-${review.player.nickname}.png`, text: t('My year in darts {{year}}', { year: review.year }) });
            if (result === 'saved') toast.current?.show({ severity: 'success', summary: t('Year in darts {{year}}', { year: review.year }), detail: t('The picture is saved.'), life: 3000 });
        } finally {
            setSharing(false);
        }
    };

    // the games of each type, as chips with the icon and colour of the game
    const TYPE_ICONS = { x01: FaBullseye, cricket: MdSportsCricket, elimination: BiTargetLock, clock: PiClockClockwiseBold };
    const facts = [
        ...(review.firstGameAt ? [[t('First game of the year'), formatDate(review.firstGameAt)]] : []),
        [t('Days at the board'), number(review.days)],
        [t('Trainings'), number(review.trainings)],
        [t('Badges earned'), number(review.badges.count)],
    ];

    return (
        <div className="container-fluid p-4">
            <Toast ref={toast} position="bottom-right" />
            <div className="d-flex flex-column gap-4">
                {/* as the header of a player's statistics: the title, then a line of facts */}
                <header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex flex-column gap-3 min-w-0">
                        <div className="d-flex flex-column gap-1">
                            <h1 className="fs-2 fw-semibold text-default m-0">{own ? t('Your year in darts {{year}}', { year: review.year }) : t('Year in darts {{year}}', { year: review.year })}</h1>
                            <span className="text-subtle">{review.player.nickname}{activeClub?.name ? ` · ${activeClub.name}` : ''}</span>
                        </div>
                        {!nothing &&
                            <dl className="d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                                {facts.map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-faint fs-8 fw-normal">{label}</dt>
                                        <dd className="text-default fw-semibold m-0 tabular-nums">{value}</dd>
                                    </div>
                                ))}
                            </dl>}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {review.years.length > 1 &&
                            <Dropdown value={review.year} options={review.years.map(entry => ({ label: String(entry), value: entry }))} onChange={(event) => setParams({ year: event.value })} aria-label={t('Year')} />}
                        {!nothing && <Button label={t('Share')} icon="pi pi-share-alt" size="small" loading={sharing} onClick={share} />}
                    </div>
                </header>

                {nothing
                    ? <p className="text-subtle m-0">{t('No finished game in {{year}} yet.', { year: review.year })}</p>
                    : <>
                        <div className="row g-4">
                        <div className={x01 ? 'col-12 col-xl-6' : 'col-12'}>
                        <Panel header={t('Games')} className="h-100">
                            <div className="kpi-headline mb-4">
                                <KpiHero label={t('Games played')} value={number(review.games.total)} color={ACCENT.green} />
                                <KpiHero label={t('Wins')} value={number(review.games.wins)} detail={review.games.together ? t('{{percent}} % of the games with others', { percent: review.games.winRate }) : null} color={ACCENT.green} />
                            </div>
                            <div className="kpi-chips">
                                {Object.entries(review.games.byType).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                                    <KpiChip key={kind} icon={TYPE_ICONS[kind] ?? rulesIcon(kind)} label={gameTitle(kind)} value={number(count)} color={GAME_COLORS[kind] ?? GAME_COLORS.rules ?? ACCENT.green} />
                                ))}
                            </div>
                        </Panel>
                        </div>

                        {x01 &&
                            <div className="col-12 col-xl-6">
                            <Panel header={t('X01')} className="h-100">
                                <div className="kpi-headline mb-4">
                                    <KpiHero label={t('3-dart average')} value={number(x01.average, 1)} detail={tn(x01.games, '{{count}} game', '{{count}} games')} color={GAME_COLORS.x01} />
                                    <KpiHero label={t('Best game')} value={x01.bestGame ? number(x01.bestGame.average, 1) : null} detail={x01.bestGame ? formatDate(x01.bestGame.at) : null} color={GAME_COLORS.x01} />
                                </div>
                                <div className="kpi-chips">
                                    <KpiChip icon={FaFire} label={t('180s')} value={number(x01.oneEighties)} color={GAME_COLORS.x01} />
                                    <KpiChip icon={FaHashtag} label="100+" value={number(x01.tonPlus)} color={GAME_COLORS.x01} />
                                    <KpiChip icon={FaCrosshairs} label={t('Highest checkout')} value={x01.highestCheckout ? number(x01.highestCheckout) : null} color={GAME_COLORS.x01} />
                                    <KpiChip icon={FaStopwatch} label={t('Best 501 leg')} value={x01.bestLeg ? t('{{bestLeg}} darts', { bestLeg: x01.bestLeg }) : null} color={GAME_COLORS.x01} />
                                    <KpiChip icon={FaBullseye} label={t('Darts thrown')} value={number(x01.darts)} color={GAME_COLORS.x01} />
                                </div>
                            </Panel>
                            </div>}
                        </div>

                        <div className="row g-4">
                        {(review.busiestMonth || review.opponent) &&
                            <div className={review.badges.count > 0 ? 'col-12 col-xl-6' : 'col-12'}>
                        <Panel header={t('Highlights')} className="h-100">
                            <div className="kpi-chips">
                                {review.busiestMonth && <KpiChip icon={FaCalendarDays} label={t('The busiest month')} value={<span className="text-capitalize">{monthName(review.busiestMonth.month)}</span>} detail={tn(review.busiestMonth.games, '{{count}} game', '{{count}} games')} color={ACCENT.green} />}
                                {review.opponent && <KpiChip icon={FaUserGroup} label={t('Your rival of the year')} value={<Link to={`/players/${review.opponent.id}`}>{review.opponent.nickname}</Link>} detail={opponentLine} color={ACCENT.green} />}
                            </div>
                        </Panel>
                            </div>}

                        {review.badges.count > 0 &&
                            <div className={review.busiestMonth || review.opponent ? 'col-12 col-xl-6' : 'col-12'}>
                            <Panel header={t('Badges')} className="h-100">
                                <span className="text-subtle fs-7 d-block mb-3">{tn(review.badges.count, '{{count}} badge earned', '{{count}} badges earned')}{review.badges.count > review.badges.latest.length ? ` · ${t('the latest')}` : ''}</span>
                                <ul className="year-badges list-unstyled m-0">
                                    {review.badges.latest.map(badge => (
                                        <li key={badge.id}>
                                            <BadgeMedal badge={badge} size="sm" />
                                            <span className="d-flex flex-column min-w-0">
                                                <span className="text-default fs-7 fw-semibold">{badge.title}</span>
                                                <span className="text-faint fs-8">{formatDate(badge.earnedAt)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {review.badges.count > review.badges.latest.length && <Link to="/badges" className="d-inline-block mt-3 fs-7">{t('All badges')}</Link>}
                            </Panel>
                            </div>}
                        </div>
                    </>}
            </div>
        </div>
    );
};

export default YearPage;
