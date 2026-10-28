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
import { KpiHero } from '../stats/players/kpi';
import BadgeMedal from '../badges/badge.medal';
import { gameTitle } from '../admin/kind.titles';
import { Lines } from '../elements/skeletons';
import { ACCENT } from '../../utils/palette';
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
    const opponentLine = review.opponent && t('{{games}} games against {{name}}, {{wins}} of them won', { games: review.opponent.games, name: review.opponent.nickname, wins: review.opponent.wins });

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

    return (
        <div className="container-fluid p-4">
            <Toast ref={toast} position="bottom-right" />
            <div className="year-page d-flex flex-column gap-4">
                <header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <span className="year-eyebrow">{own ? t('Your year in darts') : t('Year in darts')}</span>
                        <h1 className="fs-2 fw-semibold text-default m-0">{review.year}{!own && ` · ${review.player.nickname}`}</h1>
                        {review.firstGameAt && <span className="text-subtle">{t('First game of the year: {{date}}', { date: formatDate(review.firstGameAt) })}</span>}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {review.years.length > 1 &&
                            <Dropdown value={review.year} options={review.years.map(entry => ({ label: String(entry), value: entry }))} onChange={(event) => setParams({ year: event.value })} aria-label={t('Year')} />}
                        {!nothing && <Button label={t('Share')} icon="pi pi-share-alt" size="small" loading={sharing} onClick={share} />}
                    </div>
                </header>

                {nothing
                    ? <Message severity="info" className="w-100 justify-content-start" text={t('No finished game in {{year}} yet.', { year: review.year })} />
                    : <>
                        <Panel header={t('The year at a glance')}>
                            <div className="kpi-headline">
                                <KpiHero label={tn(review.games.total, 'game played', 'games played')} value={number(review.games.total)} color={ACCENT.green} />
                                <KpiHero label={t('wins')} value={number(review.games.wins)} detail={review.games.together ? t('{{percent}} % of the games with others', { percent: review.games.winRate }) : null} color={ACCENT.gold} />
                                <KpiHero label={t('days at the board')} value={number(review.days)} color={ACCENT.green} />
                                <KpiHero label={t('trainings')} value={number(review.trainings)} color={ACCENT.green} />
                            </div>
                            <ul className="year-types list-unstyled m-0 mt-4">
                                {Object.entries(review.games.byType).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                                    <li key={kind}><span className="text-default fw-semibold">{gameTitle(kind)}</span><span className="text-subtle">{number(count)}</span></li>
                                ))}
                            </ul>
                        </Panel>

                        {x01 &&
                            <Panel header={t('X01: the best of the year')}>
                                <div className="kpi-headline">
                                    <KpiHero label={t('3-dart average')} value={number(x01.average, 1)} detail={tn(x01.games, '{{count}} game', '{{count}} games')} color={ACCENT.green} />
                                    <KpiHero label={t('Best game')} value={x01.bestGame ? number(x01.bestGame.average, 1) : '–'} detail={x01.bestGame ? formatDate(x01.bestGame.at) : null} color={ACCENT.gold} />
                                    <KpiHero label={t('180s')} value={number(x01.oneEighties)} detail={t('{{count}} visits of 100 or more', { count: number(x01.tonPlus) })} color={ACCENT.gold} />
                                    <KpiHero label={t('Highest checkout')} value={number(x01.highestCheckout)} color={ACCENT.green} />
                                    <KpiHero label={t('Best leg (501)')} value={x01.bestLeg ? t('{{count}} darts', { count: x01.bestLeg }) : '–'} color={ACCENT.green} />
                                    <KpiHero label={t('Darts thrown')} value={number(x01.darts)} color={ACCENT.green} />
                                </div>
                            </Panel>}

                        <div className="row g-4">
                            {review.busiestMonth &&
                                <div className="col-12 col-lg-6">
                                    <Panel header={t('The busiest month')} className="h-100">
                                        <span className="year-big text-capitalize">{monthName(review.busiestMonth.month)}</span>
                                        <span className="text-subtle d-block">{tn(review.busiestMonth.games, '{{count}} game', '{{count}} games')}</span>
                                    </Panel>
                                </div>}
                            {review.opponent &&
                                <div className="col-12 col-lg-6">
                                    <Panel header={t('Your rival of the year')} className="h-100">
                                        <Link to={`/players/${review.opponent.id}`} className="year-big text-decoration-none">{review.opponent.nickname}</Link>
                                        <span className="text-subtle d-block">{opponentLine}</span>
                                    </Panel>
                                </div>}
                        </div>

                        {review.badges.count > 0 &&
                            <Panel header={tn(review.badges.count, '{{count}} badge earned', '{{count}} badges earned')}>
                                <ul className="year-badges list-unstyled m-0">
                                    {review.badges.latest.map(badge => (
                                        <li key={badge.id}>
                                            <BadgeMedal badge={badge} size="md" />
                                            <span className="d-flex flex-column min-w-0">
                                                <span className="text-default fw-semibold">{badge.title}</span>
                                                <span className="text-faint fs-8">{formatDate(badge.earnedAt)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {review.badges.count > review.badges.latest.length && <Link to="/badges" className="d-inline-block mt-3">{t('All badges')}</Link>}
                            </Panel>}
                    </>}
            </div>
        </div>
    );
};

export default YearPage;
