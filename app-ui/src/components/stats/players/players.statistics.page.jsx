import { Fragment, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import PlayerService from '../../../services/player.service';
import StatsService from '../../../services/stats.service';
import LevelBadge from '../../players/level.badge';
import FormBadge from './form.badge';
import ComparisonFilters, { FilterPanel } from './comparison.filters';
import { describeFilters } from './filter.summary';
import ComparePicker from '../compare/compare.picker';
import CompareDuel from '../compare/compare.duel';
import CompareSide from '../compare/compare.side';
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
    // friendly games 'include' or 'exclude', a club format by its id, and for side by side the clubs
    friendly: 'include',
    clubFormat: 'all',
    scope: 'club',
};

const MODES = [
    { value: 'duel', label: t('Head to head'), icon: 'pi pi-users' },
    { value: 'side', label: t('Side by side'), icon: 'pi pi-th-large' },
];

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
        friendly: filters.friendly,
        ...(filters.clubFormat !== 'all' && { clubFormat: filters.clubFormat }),
    };
};

// what side by side asks for: each player's own games in the period, in this club or all
const sideRequestOf = (filters) => {
    const [from, to] = filters.range ?? [];
    return {
        scope: filters.scope,
        dateFilter: filters.period,
        ...(filters.period === 'Custom' && {
            from: from ? dayjs(from).format('YYYY-MM-DD') : undefined,
            to: to ? dayjs(to).format('YYYY-MM-DD') : (from ? dayjs(from).format('YYYY-MM-DD') : undefined),
        }),
        ...(filters.lastGames !== 'All' && { lastGames: filters.lastGames }),
    };
};

// the X01 formats played together, as the format filter offers them
const formatOptionsOf = (formats = []) => formats
    .map(format => ({ label: formatLabel(format), value: formatLabel(format), format }))
    .sort((a, b) => a.label.localeCompare(b.label));

// The charts have one colour per player, so a comparison has at most this many
const MAX_PLAYERS = ChartConfigOptions.fillColors.values.length;

/**
 * Compares two or more players of the selected club: head to head in one of
 * the nine games (their games together), or each on their own side by side
 * (all their games). The players, the mode and the filters live in the
 * address, so a comparison can be shared as a link.
 */
const PlayersStatisticsPage = () => {
    const { user } = useAuth();
    const [players, setPlayers] = useState(null);
    const [chosen, setChosen] = useUrlState({ players: '', mode: 'duel', vs: '' });
    const selectedIds = useMemo(() => chosen.players ? chosen.players.split(',') : [], [chosen.players]);
    const setSelectedIds = (ids) => setChosen({ players: ids.join(',') });
    const mode = chosen.mode === 'side' ? 'side' : 'duel';
    const [levels, setLevels] = useState({});
    const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
    // what the last duel offered to filter by: the X01 formats played together and the club's formats
    const [options, setOptions] = useState({ formats: [], clubFormats: [] });
    // each compared player's current form, from their own latest games
    const [forms, setForms] = useState({});
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        StatsService.loadPlayerLevels().then(setLevels).catch(() => setLevels({}));
    }, []);

    useEffect(() => {
        PlayerService.searchPlayers('').then(loaded => {
            // your own player starts selected, so picking one more shows a comparison
            const sorted = [...loaded].sort((a, b) => a.nickname.localeCompare(b.nickname));
            setPlayers(sorted);
            const own = sorted.find(player => player.user === user.id);
            const params = new URLSearchParams(window.location.search);
            // "vs": you against that player (from their statistics)
            const vs = params.get('vs');
            if (vs) setChosen({ players: own && own.id !== vs ? `${own.id},${vs}` : vs, vs: '' });
            // unless the address already names the players
            else if (own && !params.get('players')) setChosen({ players: own.id });
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

    const selected = useMemo(
        () => selectedIds.map(id => players?.find(player => player.id === id)).filter(Boolean),
        [selectedIds, players]
    );
    const formats = formatOptionsOf(options.formats);

    // the picker and the comparison in their places while the players load
    if (!players) {
        return (
            <div className="container-fluid p-4 border-0">
                <div className="d-flex flex-column gap-4">
                    <CardSkeleton title={t('Players')} />
                    <CardSkeleton chart />
                </div>
            </div>
        );
    }

    const own = players.find(player => player.user === user.id);
    const colours = ChartConfigOptions.fillColors.values;
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };
    const filterProps = mode === 'duel'
        ? { formats, withFriendly: true, clubFormats: options.clubFormats }
        : { formats: [], withType: false, withOthers: false, withScope: true, withX01: false, lastGamesLabel: t('Last games') };

    return (
        <div className="container-fluid p-4 border-0">
            {/* who is compared, at the top; the comparison below uses the whole width */}
            <ComparePicker
                        players={players}
                        selectedIds={selectedIds}
                        onChange={setSelectedIds}
                        levels={levels}
                        ownId={own?.id ?? null}
                        maxPlayers={MAX_PLAYERS}
                        colours={colours}
                    />

                <div className="min-w-0">
                    {selected.length < 2 &&
                        <header className="hero-header rounded-2 p-4 mb-4 d-flex flex-column gap-2">
                            <h1 className="fs-2 fw-semibold text-default m-0">{t('Player comparison')}</h1>
                            <span className="text-subtle">
                                {selected.length === 0
                                    ? t('Pick two or more players to compare them, or take one of the quick picks.')
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
                                {/* the mode, and the comparison as a link to share */}
                                <div className="compare-toolbar">
                                    <SelectButton
                                        value={mode}
                                        options={MODES}
                                        onChange={(e) => e.value && setChosen({ mode: e.value })}
                                        itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-2"><i className={option.icon} aria-hidden="true" />{option.label}</span>}
                                        className="p-selectbutton-pills pills-inline"
                                        aria-label={t('How to compare')}
                                    />
                                    <Button type="button" label={copied ? t('Link copied') : t('Copy link')} icon={copied ? 'pi pi-check' : 'pi pi-link'} size="small" severity="secondary" text onClick={copyLink} className="compare-copy" aria-label={copied ? t('Link copied') : t('Copy link')} />
                                </div>
                                {/* three or four: everyone against everyone, side by side with "vs." between them */}
                                {selected.length > 2 &&
                                    <div className="compare-field">
                                        {selected.map((player, index) => (
                                            <Fragment key={player.id}>
                                                {index > 0 && <span className="compare-vs text-faint fw-semibold fs-6">{t('vs.')}</span>}
                                                <div className="compare-entrant">
                                                    <Avatar
                                                        label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                        image={resolvePlayerImg(player.profileImg)}
                                                        shape="circle"
                                                        className="avatar-lg bg-surface-high compare-avatar"
                                                        style={{ '--compare-colour': colours[index] }}
                                                    />
                                                    <Link to={`/players/${player.id}`} className="fs-5 fw-semibold text-default text-decoration-none text-center">{player.nickname}</Link>
                                                    <span className="text-subtle fs-8 text-center">{player.firstname} {player.lastname}</span>
                                                    <LevelBadge level={levels[player.id]} />
                                                    {/* beside each other in a wide column, one under the other in a narrow one */}
                                                    <span className="d-none d-sm-inline-flex"><FormBadge form={forms[player.id]} color={colours[index]} /></span>
                                                    <span className="d-sm-none"><FormBadge form={forms[player.id]} color={colours[index]} stacked /></span>
                                                </div>
                                            </Fragment>
                                        ))}
                                    </div>}
                                {selected.length === 2 && <>
                                {/* the two sides face each other around "vs.", which stays in the middle */}
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
                                                                style={{ '--compare-colour': colours[index] }}
                                                            />
                                                            <span className={`d-flex flex-column ${sideIndex === 0 ? 'align-items-end' : 'align-items-start'}`}>
                                                                <Link to={`/players/${player.id}`} className="fs-4 fw-semibold text-default text-decoration-none">{player.nickname}</Link>
                                                                <span className="text-subtle fs-7">{player.firstname} {player.lastname}</span>
                                                                <span className="mt-1"><LevelBadge level={levels[player.id]} /></span>
                                                                <span className="mt-1"><FormBadge form={forms[player.id]} color={colours[index]} align={sideIndex === 0 ? 'end' : 'start'} /></span>
                                                            </span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                                </>}
                                <FilterPanel {...describeFilters(filters, DEFAULT_FILTERS, { ...filterProps, withType: filterProps.withType ?? true, withOthers: filterProps.withOthers ?? true })}>
                                    <ComparisonFilters filters={filters} onChange={setFilters} {...filterProps} />
                                </FilterPanel>
                            </header>
                            {mode === 'duel'
                                ? <CompareDuel
                                    type={filters.type}
                                    players={selected}
                                    request={requestOf(filters, formats)}
                                    colours={colours}
                                    onData={(answer) => setOptions(answer.filterOptions ?? { formats: [], clubFormats: [] })}
                                    onSideBySide={() => setChosen({ mode: 'side' })}
                                />
                                : <CompareSide players={selected} request={sideRequestOf(filters)} colours={colours} />}
                        </>
                    }
                </div>
        </div>
    );
};

export default PlayersStatisticsPage;
