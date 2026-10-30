import { Panel } from 'primereact/panel';
import { Skeleton } from 'primereact/skeleton';

import ClubLogo from './club.logo';
import { t } from '../../utils/i18n';
import { DashboardCell, DashboardGrid } from '../dashboard/dashboard.grid';

/**
 * Placeholders in the shape of a page while its data loads: the layout stands
 * from the first moment and only the content fills in, instead of a loader
 * that blinks and a page that jumps into place.
 */

// what a screen reader hears while the shapes are shown
const Loading = ({ what }) => <span className="visually-hidden" role="status">{t('Loading')}{' '}{what}…</span>;

// a label over a value, as in the key figures of the headers
const Fact = ({ width = '4.5rem' }) => (
    <div className="d-flex flex-column gap-2">
        <Skeleton width="4rem" height="0.7rem" />
        <Skeleton width={width} height="1.1rem" />
    </div>
);

// a few lines of a card, the first one longer (also for a card that loads on its own)
export const Lines = ({ count = 3 }) => (
    <div className="d-flex flex-column gap-3">
        {Array.from({ length: count }, (_, index) => <Skeleton key={index} width={index === 0 ? '70%' : index % 2 ? '90%' : '55%'} height="0.9rem" />)}
    </div>
);

// a card with a title and a chart or a list
export const CardSkeleton = ({ title, chart = false, className = '' }) => (
    <Panel header={title ?? <Skeleton width="8rem" height="1rem" />} className={`h-100 ${className}`}>
        {chart ? <Skeleton height="11rem" /> : <Lines count={4} />}
    </Panel>
);

/**
 * The header and the first cards of a player's statistics.
 */
export const PlayerStatsSkeleton = () => (
    <div aria-busy="true">
        <Loading what={t('the statistics')} />
        <header className="hero-header rounded-2 p-4 mb-4 d-flex flex-wrap align-items-start gap-4">
            <Skeleton shape="circle" size="8rem" />
            <div className="d-flex flex-column gap-3" style={{ minWidth: 0, flex: '1 1 20rem' }}>
                <div className="d-flex flex-column gap-2">
                    <Skeleton width="14rem" height="2rem" />
                    <Skeleton width="8rem" height="0.9rem" />
                </div>
                <div className="d-flex align-items-center gap-3">
                    <Skeleton width="9rem" height="2.3rem" borderRadius="999px" />
                    <div className="d-flex flex-column gap-2" style={{ flex: '0 1 18rem' }}>
                        <Skeleton height="0.5rem" />
                        <Skeleton width="70%" height="0.75rem" />
                    </div>
                </div>
                <div className="d-flex flex-wrap column-gap-5 row-gap-3">
                    <Fact /><Fact width="3rem" /><Fact width="5rem" /><Fact width="6rem" /><Fact width="4rem" /><Fact width="4rem" />
                </div>
            </div>
            <div className="d-flex flex-column gap-2">
                <Skeleton width="5rem" height="0.7rem" />
                <div className="d-flex gap-2">
                    {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} shape="circle" size="2.25rem" />)}
                </div>
            </div>
        </header>
        <div className="row g-4">
            <div className="col-12"><CardSkeleton title={t('X01')} chart /></div>
            <div className="col-12 col-lg-6"><CardSkeleton /></div>
            <div className="col-12 col-lg-6"><CardSkeleton /></div>
        </div>
    </div>
);

/**
 * A player's profile before even the player is known: the statistics and the
 * badges below them.
 */
export const PlayerProfileSkeleton = () => (
    <div className="container-fluid p-4 border-0">
        <PlayerStatsSkeleton />
        <div className="mt-5"><BadgesSkeleton /></div>
    </div>
);

/**
 * The badge collection: its title and a few series with their medals.
 */
export const BadgesSkeleton = () => (
    <div className="d-flex flex-column gap-3" aria-busy="true">
        <Loading what={t('the badges')} />
        <Skeleton width="9rem" height="1.6rem" />
        <Panel header={<Skeleton width="7rem" height="1rem" />}>
            <div className="d-flex flex-column gap-4">
                {Array.from({ length: 3 }, (_, row) => (
                    <div key={row} className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex flex-column gap-2" style={{ flex: '1 1 14rem' }}>
                            <Skeleton width="9rem" height="0.9rem" />
                            <Skeleton width="60%" height="0.7rem" />
                        </div>
                        <div className="d-flex gap-3">
                            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} shape="circle" size="2.6rem" />)}
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    </div>
);

/**
 * The dashboard: the club is known already (logo and name), the figures and
 * the widgets the club chose fill in, each in its own place.
 */
export const DashboardSkeleton = ({ club, widgets }) => (
    <div className="container-fluid p-4 border-0" aria-busy="true">
        <Loading what={t('the dashboard')} />
        <header className="dashboard-header hero-header rounded-2 p-4 mb-4 d-flex flex-wrap align-items-start gap-4">
            <ClubLogo club={club} size="lg" />
            <div className="d-flex flex-column gap-3" style={{ minWidth: 0, flex: '1 1 18rem' }}>
                <h1 className="fs-2 fw-semibold text-default m-0 text-break">{club?.name}</h1>
                <div className="d-flex flex-wrap column-gap-5 row-gap-3">
                    <Fact width="6rem" /><Fact width="3rem" /><Fact width="3rem" /><Fact width="7rem" />
                </div>
            </div>
        </header>
        <DashboardGrid>
            {widgets.map(widget => (
                <DashboardCell widget={widget} key={widget.id}>
                    <CardSkeleton title={widget.title} chart={['activityCalendar', 'whenWePlay', 'gamesPerMonth', 'clubForm'].includes(widget.kind)} />
                </DashboardCell>
            ))}
        </DashboardGrid>
    </div>
);

// a big figure with its label, as the key figures over a list
const HeroFact = () => (
    <div className="d-flex flex-column gap-2">
        <Skeleton width="4rem" height="2rem" />
        <Skeleton width="6rem" height="0.75rem" />
    </div>
);

/**
 * The rows of a table while it loads, in place of its empty message: the
 * table stands with its columns, and no "nothing here" before the data is in.
 */
export const TableLoading = ({ rows = 6 }) => (
    <div className="py-2" aria-busy="true">
        <Loading what={t('the list')} />
        <Lines count={rows} />
    </div>
);

/**
 * The overview over a list (games, players, trainings, clubs, users, quick
 * games): its key figures, then a ranking and a card beside it. The title is
 * known already.
 */
export const OverviewSkeleton = ({ title, figures = 4 }) => (
    <div className="d-flex flex-column gap-4 mb-4" aria-busy="true">
        <Loading what={title} />
        <Panel header={title}>
            <div className="kpi-headline">
                {Array.from({ length: figures }, (_, index) => <HeroFact key={index} />)}
            </div>
        </Panel>
        <div className="row g-4">
            <div className="col-12 col-xl-7"><CardSkeleton /></div>
            <div className="col-12 col-xl-5"><CardSkeleton /></div>
        </div>
    </div>
);

/**
 * Settings in their boxes, as on the profile or a player's page: a section
 * title and a few boxes, each with a title and a line or two.
 */
export const SettingsSkeleton = ({ boxes = 3 }) => (
    <div className="d-flex flex-column" aria-busy="true">
        <Loading what={t('the settings')} />
        <Skeleton width="9rem" height="0.9rem" className="mb-3" />
        {Array.from({ length: boxes }, (_, index) => (
            <div key={index} className="mb-4">
                <div className="setting-title"><Skeleton width={index % 2 ? '7rem' : '10rem'} height="0.8rem" /></div>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col d-flex flex-column gap-2 py-1">
                        <Skeleton height="2.4rem" />
                        <Skeleton width="60%" height="0.7rem" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

/**
 * The statistics of a game: the result with the players side by side, then
 * the cards below it.
 */
export const GameStatsSkeleton = ({ players = 2 }) => (
    <div className="container-fluid p-4 border-0" aria-busy="true">
        <Loading what={t('the game')} />
        <div className="game-stats-page">
            <header className="hero-header result-hero rounded-2 p-4 mb-4">
                <div className="d-flex flex-column gap-2 mb-4">
                    <Skeleton width="16rem" height="1.4rem" />
                    <Skeleton width="11rem" height="0.8rem" />
                </div>
                <div className="d-flex flex-wrap justify-content-around gap-4">
                    {Array.from({ length: players }, (_, index) => (
                        <div key={index} className="d-flex flex-column align-items-center gap-3" style={{ flex: '1 1 12rem' }}>
                            <Skeleton shape="circle" size="6rem" />
                            <Skeleton width="7rem" height="1rem" />
                            <Skeleton width="3rem" height="2.4rem" />
                            <div className="d-flex flex-column gap-2 w-100" style={{ maxWidth: '16rem' }}>
                                <Skeleton height="0.8rem" />
                                <Skeleton height="0.8rem" />
                                <Skeleton height="0.8rem" />
                            </div>
                        </div>
                    ))}
                </div>
            </header>
            <div className="d-flex flex-column gap-4">
                <CardSkeleton chart />
                <CardSkeleton />
            </div>
        </div>
    </div>
);
