import { Fragment, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';

import PlayerService from '../../../services/player.service';
import StatsService from '../../../services/stats.service';
import LevelBadge from '../../players/level.badge';
import FormBadge from './form.badge';
import PlayerVSStats from './player.vs.stats';
import OtherHeadToHead from './other.head.to.head';
import ComparisonFilters, { FilterPanel } from './comparison.filters';
import { describeFilters } from './filter.summary';
import X01Service from '../../../services/x01.service';
import ChartConfigOptions from '../common/chart.config.options';
import { useAuth } from '../../../utils/auth.context';
import { useUrlFilters, useUrlState } from '../../../utils/use.url.state';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { CardSkeleton } from '../../elements/skeletons';
import { t, tn } from '../../../utils/i18n';

const DEFAULT_FILTERS = {
    type: 'x01',
    period: 'All',
    range: null,
    lastGames: 'All',
    startingScore: 'All',
    format: 'all',
    includeOthers: false,
};

const formatLabel = (game) =>
    `${game.setMode} ${tn(game.numberOfSets, '{{count}} set', '{{count}} sets')} · ${game.legMode} ${tn(game.numberOfLegs, '{{count}} leg', '{{count}} legs')}`;

/**
 * What the server is asked for, from the filters in the header.
 */
const requestOf = (filters, formats) => {
    const [from, to] = filters.range ?? [];
    const format = formats.find(entry => entry.value === filters.format)?.format;
    return {
        includeOthers: filters.includeOthers,
        dateFilter: filters.period,
        ...(filters.period === 'Custom' && {
            from: from ? dayjs(from).format('YYYY-MM-DD') : undefined,
            to: to ? dayjs(to).format('YYYY-MM-DD') : (from ? dayjs(from).format('YYYY-MM-DD') : undefined),
        }),
        ...(filters.lastGames !== 'All' && { lastGames: filters.lastGames }),
        ...(filters.type === 'x01' && filters.startingScore !== 'All' && { startingScore: filters.startingScore }),
        ...(filters.type === 'x01' && format && { format }),
    };
};

// The charts have one colour per player, so a comparison has at most this many
const MAX_PLAYERS = ChartConfigOptions.fillColors.values.length;

/**
 * Compares two or more players of the selected club. A single player's
 * statistics are on their profile.
 */
const PlayersStatisticsPage = () => {
    const { user } = useAuth();
    const [players, setPlayers] = useState(null);
    // the players compared and the filters live in the address
    const [chosen, setChosen] = useUrlState({ players: '' });
    const selectedIds = useMemo(() => chosen.players ? chosen.players.split(',') : [], [chosen.players]);
    const setSelectedIds = (next) => setChosen({ players: (typeof next === 'function' ? next(selectedIds) : next).join(',') });
    const [search, setSearch] = useState('');
    const [levels, setLevels] = useState({});
    const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
    // the X01 formats these players have played together, for the format filter
    const [formats, setFormats] = useState([]);
    // each compared player's current form, from their own latest games
    const [forms, setForms] = useState({});

    useEffect(() => {
        StatsService.loadPlayerLevels().then(setLevels).catch(() => setLevels({}));
    }, []);

    useEffect(() => {
        PlayerService.searchPlayers('').then(loaded => {
            // your own player starts selected, so picking one more shows a comparison
            const sorted = [...loaded].sort((a, b) => a.nickname.localeCompare(b.nickname));
            setPlayers(sorted);
            const own = sorted.find(player => player.user === user.id);
            // unless the address already names the players
            if (own && !new URLSearchParams(window.location.search).get('players')) setChosen({ players: own.id });
        }).catch(error => {
            console.error('Failed to load players', error);
            setPlayers([]);
        });
    }, [user.id, setChosen]);

    const selectedKey = selectedIds.join(',');
    useEffect(() => {
        if (selectedIds.length < 2) return;
        StatsService.loadPlayersForm(selectedIds).then(setForms).catch(() => setForms({}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey]);

    useEffect(() => {
        if (selectedIds.length < 2) return;
        X01Service.findX01Games({ playerIds: selectedIds, includeOthers: filters.includeOthers, dateFilter: 'All' })
            .then(games => {
                const unique = new Map();
                games.forEach(game => {
                    const label = formatLabel(game);
                    if (!unique.has(label)) {
                        unique.set(label, { label, value: label, format: { setMode: game.setMode, numberOfSets: game.numberOfSets, legMode: game.legMode, numberOfLegs: game.numberOfLegs } });
                    }
                });
                setFormats([...unique.values()].sort((a, b) => a.label.localeCompare(b.label)));
            })
            .catch(() => setFormats([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey, filters.includeOthers]);

    const selected = useMemo(
        () => selectedIds.map(id => players?.find(player => player.id === id)).filter(Boolean),
        [selectedIds, players]
    );

    // the picker and the comparison in their places while the players load
    if (!players) {
        return (
            <div className="container-fluid p-4 border-0">
                <div className="row g-4">
                    <div className="col-12 col-lg-4 col-xxl-3"><CardSkeleton title={t('Players')} /></div>
                    <div className="col-12 col-lg-8 col-xxl-9"><CardSkeleton chart /></div>
                </div>
            </div>
        );
    }

    const toggle = (player) => setSelectedIds(ids => ids.includes(player.id)
        ? ids.filter(id => id !== player.id)
        : ids.length < MAX_PLAYERS ? [...ids, player.id] : ids);

    const term = search.trim().toLowerCase();
    const visible = players.filter(player =>
        !term || [player.nickname, player.firstname, player.lastname].some(value => value.toLowerCase().includes(term)));


    return (
        <div className="container-fluid p-4 border-0">
            <div className="row g-4">
                <div className="col-12 col-lg-4 col-xxl-3">
                    <Panel header={t('Players')} className="players-picker">
                        <div className="d-flex flex-column gap-3">
                            <span className="p-input-icon-left w-100">
                                <i className="pi pi-search" />
                                <InputText
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Search players')}
                                    aria-label={t('Search players')}
                                    className="w-100"
                                />
                            </span>
                            <span className="text-faint fs-8">
                                {t('Pick two to')}{' '}{MAX_PLAYERS}{' '}{t('players to compare them.')}
                            </span>
                            {players.length === 0 && <span className="text-subtle">{t('This club has no players yet.')}</span>}
                            <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                                {visible.map(player => {
                                    const index = selectedIds.indexOf(player.id);
                                    const isSelected = index !== -1;
                                    const isFull = !isSelected && selectedIds.length >= MAX_PLAYERS;
                                    return (
                                        <li key={player.id}>
                                            <label
                                                htmlFor={`pick-${player.id}`}
                                                className={`players-picker-row ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                                            >
                                                <Checkbox
                                                    inputId={`pick-${player.id}`}
                                                    checked={isSelected}
                                                    disabled={isFull}
                                                    onChange={() => toggle(player)}
                                                />
                                                <Avatar
                                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                    image={resolvePlayerImg(player.profileImg)}
                                                    shape="circle"
                                                    className="avatar-sm bg-surface-high"
                                                />
                                                <span className="d-flex flex-column flex-grow-1 min-w-0">
                                                    <span className="text-default fw-semibold text-truncate">
                                                        {player.nickname}{player.user === user.id && <span className="text-faint fw-normal">{' '}{t('(you)')}</span>}
                                                    </span>
                                                    <span className="text-faint fs-8 text-truncate">{player.firstname} {player.lastname}</span>
                                                </span>
                                                {/* in a comparison the dot is the player's colour in the charts */}
                                                {isSelected && selectedIds.length > 1 &&
                                                    <span className="players-picker-colour" style={{ background: ChartConfigOptions.fillColors.values[index] }} aria-hidden="true" />
                                                }
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </Panel>
                </div>

                <div className="col-12 col-lg-8 col-xxl-9 min-w-0">
                    {selected.length < 2 &&
                        <header className="hero-header rounded-2 p-4 mb-4 d-flex flex-column gap-2">
                            <h1 className="fs-2 fw-semibold text-default m-0">{t('Player comparison')}</h1>
                            <span className="text-subtle">
                                {selected.length === 0
                                    ? t('Pick two or more players on the left to compare them.')
                                    : t('Pick at least one more player to compare with {{nickname}}.', { nickname: selected[0].nickname })}
                            </span>
                            {selected.length === 1 &&
                                <Link to={`/players/${selected[0].id}`} className="fs-7 align-self-start">
                                    {t('Open the profile of')}{' '}{selected[0].nickname} <i className="pi pi-arrow-right fs-8 ms-1" aria-hidden="true" />
                                </Link>
                            }
                        </header>
                    }
                    {selected.length > 1 &&
                        <>
                            <header className="hero-header hero-header-centered rounded-2 p-4 mb-4 d-flex flex-column gap-3">
                                <span className="text-faint fs-8 text-uppercase text-center" style={{ letterSpacing: '0.08em' }}>{t('Head to head')}</span>
                                {/* the two sides face each other around "vs.", which stays in the middle under the heading */}
                                <div className="compare-faceoff">
                                    {[selected.slice(0, Math.ceil(selected.length / 2)), selected.slice(Math.ceil(selected.length / 2))].map((side, sideIndex) => (
                                        <Fragment key={sideIndex}>
                                            {sideIndex === 1 && <span className="compare-vs text-faint fw-semibold fs-5">{t('vs.')}</span>}
                                            <div className={`compare-side ${sideIndex === 0 ? 'is-left' : 'is-right'}`}>
                                                {side.map(player => {
                                                    const index = selected.indexOf(player);
                                                    return (
                                                        // the left side shows name then picture, the right side picture then name
                                                        <span key={player.id} className={`d-flex align-items-center gap-3 ${sideIndex === 0 ? 'flex-row-reverse text-end' : ''}`}>
                                                            <Avatar
                                                                label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                                image={resolvePlayerImg(player.profileImg)}
                                                                shape="circle"
                                                                className="avatar-lg bg-surface-high compare-avatar"
                                                                style={{ '--compare-colour': ChartConfigOptions.fillColors.values[index] }}
                                                            />
                                                            <span className={`d-flex flex-column ${sideIndex === 0 ? 'align-items-end' : 'align-items-start'}`}>
                                                                <span className="fs-4 fw-semibold text-default">{player.nickname}</span>
                                                                <span className="text-subtle fs-7">{player.firstname} {player.lastname}</span>
                                                                <span className="mt-1"><LevelBadge level={levels[player.id]} /></span>
                                                                <span className="mt-1"><FormBadge form={forms[player.id]} color={ChartConfigOptions.fillColors.values[index]} align={sideIndex === 0 ? 'end' : 'start'} /></span>
                                                            </span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                                <FilterPanel {...describeFilters(filters, DEFAULT_FILTERS, { formats })}>
                                    <ComparisonFilters filters={filters} onChange={setFilters} formats={formats} />
                                </FilterPanel>
                            </header>
                            {filters.type === 'x01'
                                ? <PlayerVSStats players={selected} request={requestOf(filters, formats)} />
                                : <OtherHeadToHead type={filters.type} players={selected} request={{ ...requestOf(filters, formats), playerIds: selectedIds }} />
                            }
                        </>
                    }
                </div>
            </div>
        </div>
    );
};

export default PlayersStatisticsPage;
