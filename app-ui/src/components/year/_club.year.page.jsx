import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { FaBullseye, FaCalendarCheck, FaChartLine, FaCrosshairs, FaFire, FaHashtag, FaSpoon, FaTrophy } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { PiClockClockwiseBold } from 'react-icons/pi';

import StatsService from '../../services/stats.service';
import { useAuth } from '../../utils/auth.context';
import { locale, t, tn } from '../../utils/i18n';
import { shareCard } from '../../utils/share.card';
import { KpiChip } from '../stats/players/kpi';
import { rulesIcon } from '../rules/rules.icons';
import { gameTitle } from '../admin/kind.titles';
import { Lines } from '../elements/skeletons';
import { ACCENT, GAME_COLORS } from '../../utils/palette';
import usePageTitle from '../../utils/use.page.title';
import { defaultYear } from '../../utils/year.in.darts';

const number = (value, digits = 0) => (value == null ? '–' : new Intl.NumberFormat(locale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value));

// the awards of the year, as those of a darts evening: the icon of the same figure, the cup in gold
const AWARDS = {
    champion: { icon: FaTrophy, gold: true, title: t('Champion of the year'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
    mostGames: { icon: FaHashtag, title: t('Most games played'), value: (value) => tn(value, '{{count}} game', '{{count}} games') },
    average: { icon: FaChartLine, title: t('Best average'), value: (value) => number(value, 2) },
    oneEighties: { icon: FaFire, title: t('Most 180s'), value: (value) => tn(value, '{{count}} × 180', '{{count}} × 180') },
    checkout: { icon: FaCrosshairs, title: t('Highest checkout'), value: (value) => String(value) },
    clubNights: { icon: FaCalendarCheck, title: t('Most club nights'), value: (value) => tn(value, '{{count}} night', '{{count}} nights') },
    woodenSpoon: { icon: FaSpoon, title: t('Wooden spoon'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
};
const TYPE_ICONS = { x01: FaBullseye, cricket: MdSportsCricket, elimination: BiTargetLock, clock: PiClockClockwiseBold };

/**
 * "The club's year": what the club played in a year, and its awards — the
 * champion, the most games, the best average, the most 180s, the highest
 * checkout, the most club nights and the wooden spoon — with a picture of
 * it to share. For the look back each December, and any year after it.
 */
const ClubYearPage = () => {
    const [params, setParams] = useSearchParams();
    const { activeClub } = useAuth();
    const year = Number(params.get('year')) || defaultYear();
    const [review, setReview] = useState(null);
    const [error, setError] = useState('');
    const [sharing, setSharing] = useState(false);
    const toast = useRef(null);
    usePageTitle(t('The club\'s year {{year}}', { year }));

    useEffect(() => {
        setReview(null);
        StatsService.loadClubYear(year).then(setReview).catch(err => setError(err.message));
    }, [year, activeClub?.id]);

    if (error) return <div className="container-fluid p-4"><Message severity="error" text={error} /></div>;
    if (!review) return <div className="container-fluid p-4"><Lines count={8} /></div>;

    const nothing = review.games.total === 0;
    const facts = [
        [t('Games'), number(review.games.total)],
        [t('Players'), number(review.players)],
        [t('Days at the board'), number(review.days)],
        ...(review.clubNights ? [[t('Club nights'), number(review.clubNights)]] : []),
        ...(review.oneEighties ? [[t('180s'), number(review.oneEighties)]] : []),
    ];

    const share = async () => {
        setSharing(true);
        try {
            // the four awards of the board as tiles: who holds it, the award and its figure under it
            const figures = review.awards.filter(award => ['champion', 'average', 'oneEighties', 'checkout'].includes(award.id))
                .map(award => ({ value: award.player.nickname, label: `${AWARDS[award.id].title} · ${AWARDS[award.id].value(award.value)}` }));
            const result = await shareCard({
                eyebrow: t('The club\'s year {{year}}', { year: review.year }),
                title: review.club.name,
                subtitle: [tn(review.players, '{{count}} player', '{{count}} players'), tn(review.days, '{{count}} day at the board', '{{count}} days at the board')].join(' · '),
                hero: { value: number(review.games.total), label: tn(review.games.total, 'game played', 'games played') },
                figures,
            }, { filename: `legmate-${review.year}-${review.club.name}.png`, text: t('The club\'s year {{year}}', { year: review.year }), gold: true });
            if (result === 'saved') toast.current?.show({ severity: 'success', summary: t('The club\'s year {{year}}', { year: review.year }), detail: t('The picture is saved.'), life: 3000 });
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="container-fluid p-4">
            <Toast ref={toast} position="bottom-right" />
            <div className="d-flex flex-column gap-4">
                <header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex flex-column gap-3 min-w-0">
                        <div className="d-flex flex-column gap-1">
                            <h1 className="fs-2 fw-semibold text-default m-0">{t('The club\'s year {{year}}', { year: review.year })}</h1>
                            <span className="text-subtle">{review.club.name}</span>
                        </div>
                        {!nothing &&
                            <dl className="hero-facts d-flex flex-wrap column-gap-5 row-gap-2 m-0">
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
                    : (
                        <div className="row g-4">
                            <div className="col-12 col-xl-8">
                                <Panel header={t('Awards of the year')} className="h-100">
                                    {review.awards.length
                                        ? (
                                            <div className="kpi-chips kpi-chips-wide">
                                                {review.awards.map(award => {
                                                    const words = AWARDS[award.id];
                                                    if (!words) return null;
                                                    return <KpiChip key={award.id} icon={words.icon} value={words.value(award.value)} label={words.title} detail={<Link to={`/players/${award.player.id}`}>{award.player.nickname}</Link>} color={words.gold ? ACCENT.gold : ACCENT.green} />;
                                                })}
                                            </div>
                                        )
                                        : <p className="text-subtle fs-7 m-0">{t('The awards go to the club\'s members for the club\'s own games; none of them played one yet.')}</p>}
                                </Panel>
                            </div>
                            <div className="col-12 col-xl-4">
                                <Panel header={t('Games')} className="h-100">
                                    <div className="kpi-chips">
                                        {Object.entries(review.games.byType).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                                            <KpiChip key={kind} icon={TYPE_ICONS[kind] ?? rulesIcon(kind)} label={gameTitle(kind)} value={number(count)} color={GAME_COLORS[kind] ?? GAME_COLORS.rules ?? ACCENT.green} />
                                        ))}
                                    </div>
                                </Panel>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default ClubYearPage;
