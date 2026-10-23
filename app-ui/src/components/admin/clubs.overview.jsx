import { useMemo } from 'react';
import { Panel } from 'primereact/panel';

import ClubLogo from '../elements/club.logo';
import { ClubRanking } from './installation.parts';
import { formatNumber, scrollToList } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { QUIET_DAYS, clubsOverview } from '../../utils/admin.overviews';
import { t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
const SHOWN = 6;

// a few clubs with a line each, e.g. the quiet or the newest ones
const ClubList = ({ clubs, lineOf, onPick, empty }) => clubs.length === 0
    ? <span className="text-faint fs-7">{empty}</span>
    : (
        <ul className="training-popular list-unstyled m-0">
            {clubs.slice(0, SHOWN).map(club => (
                <li key={club.id}>
                    <button type="button" className="clubs-overview-row" onClick={() => onPick(club)}>
                        <ClubLogo club={club} size="sm" className="flex-shrink-0" />
                        <span className="d-flex flex-column min-w-0">
                            <span className="text-default fw-semibold text-truncate">{club.name}</span>
                            <span className="text-faint fs-8">{lineOf(club)}</span>
                        </span>
                    </button>
                </li>
            ))}
            {clubs.length > SHOWN && <li className="text-faint fs-8">{t('and {{count}} more', { count: clubs.length - SHOWN })}</li>}
        </ul>
    );

/**
 * The clubs at a glance, above their list: how many, public, active lately
 * and in need of an admin; the largest, those playing most, the quiet and
 * the newest clubs. A click picks the club into the search of the list.
 * clubs: the rows of the list; onPick(club)
 */
const ClubsOverview = ({ clubs, onPick }) => {
    const overview = useMemo(() => clubsOverview(clubs ?? []), [clubs]);

    if (!overview.total) return null;
    const pick = (club) => { onPick(club); scrollToList(); };
    const pickEntry = (entry) => pick(entry.club);
    const date = (value) => formatDate(value);

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Clubs at a glance')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Clubs')} value={formatNumber(overview.total)} color={GREEN} />
                    <KpiHero label={t('Playing lately')} value={formatNumber(overview.activeLately)} detail={t('in the last 30 days')} color={GREEN} />
                    <KpiHero label={t('Public')} value={formatNumber(overview.public)} detail={t('on the public start page')} color={GREEN} />
                    <KpiHero label={t('Needs an admin')} value={formatNumber(overview.needsAdmin)} detail={overview.needsAdmin ? t('looked after by global admins only') : null} color={GREEN} />
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <Panel header={t('Largest clubs')} className="h-100">
                        <ClubRanking
                            pickLabel={t('Show this club in the list')}
                            onPick={pickEntry}
                            entries={overview.largest.map(club => ({
                                id: club.id,
                                club,
                                value: club.playerCount,
                                label: <><strong className="text-default">{formatNumber(club.playerCount)}</strong>{' '}{club.playerCount === 1 ? t('player') : t('players')}</>,
                                line: tn(club.admins?.length ?? 0, '{{count}} admin', '{{count}} admins'),
                            }))}
                        />
                    </Panel>
                </div>
                <div className="col-12 col-xl-6">
                    <Panel header={t('Clubs playing most')} className="h-100">
                        <ClubRanking
                            pickLabel={t('Show this club in the list')}
                            onPick={pickEntry}
                            entries={overview.mostGames.map(club => ({
                                id: club.id,
                                club,
                                value: club.gameCount,
                                label: <><strong className="text-default">{formatNumber(club.gameCount)}</strong>{' '}{club.gameCount === 1 ? t('game') : t('games')}</>,
                                line: t('last {{date}}', { date: date(club.lastActivityAt) }),
                            }))}
                        />
                    </Panel>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-6">
                    <Panel header={t('Quiet clubs')} className="h-100">
                        <p className="text-faint fs-8 mt-0 mb-3">{t('No game for more than {{days}} days, the longest quiet first.', { days: QUIET_DAYS })}</p>
                        <ClubList
                            clubs={overview.quiet}
                            onPick={pick}
                            empty={t('Every club played lately.')}
                            lineOf={(club) => club.gameCount ? t('last {{date}}', { date: date(club.lastActivityAt) }) : t('no game yet · since {{date}}', { date: date(club.createdAt) })}
                        />
                    </Panel>
                </div>
                <div className="col-12 col-lg-6">
                    <Panel header={t('Newest clubs')} className="h-100">
                        <ClubList
                            clubs={overview.newest}
                            onPick={pick}
                            lineOf={(club) => <>{t('founded {{date}}', { date: date(club.createdAt) })} · {tn(club.playerCount, '{{count}} player', '{{count}} players')}</>}
                        />
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default ClubsOverview;
