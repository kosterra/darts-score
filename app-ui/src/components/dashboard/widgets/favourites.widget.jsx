import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import GameTypeIcon from '../../elements/game.type.icon';
import { gameTitle } from '../../admin/kind.titles';
import { rulesText } from '../../tournaments/tournament.words';
import { gameOf } from '../../../rules/games';
import { saveSetup } from '../../../utils/setup.memory';
import { relativeTime } from '../../../utils/relative.time';
import { t, tn } from '../../../utils/i18n';

// what a favourite plays, in a few words
const describe = (favourite) => {
    const { type, kind, settings } = favourite;
    if (type === 'x01') return rulesText({ numberOfSets: 1, setMode: 'Best of', ...settings });
    if (type === 'cricket') return t(settings.variant ?? 'Standard');
    if (type === 'elimination') return `${settings.targetScore} · ${t(settings.gameOutMode ?? 'Double Out')}`;
    if (type === 'clock') return t(settings.mode ?? 'All');
    const definition = gameOf(kind);
    return (definition?.options ?? []).map(option => option.values.find(value => value.value === settings[option.key])?.label).filter(Boolean).map(label => t(label)).join(' · ');
};

// where the setup of a game is, and the name its last setup is remembered under
const SETUPS = { x01: ['/x01', 'x01'], cricket: ['/cricket', 'cricket'], elimination: ['/elimination', 'elimination'], clock: ['/clock', 'clock'] };
const setupOf = (favourite) => (favourite.type === 'rules' ? [`/play/${favourite.kind}`, `rules.${favourite.kind}`] : SETUPS[favourite.type]);

/**
 * The games the player plays most lately, each the same game with the same
 * settings against the same opponents: one tap starts it again, Change opens
 * its setup filled in. And always the bot at the player's own level.
 */
const FavouritesWidget = ({ widget, players }) => {
    const navigate = useNavigate();
    const [favourites, setFavourites] = useState(null);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        StatsService.loadFavourites().then(setFavourites).catch(() => setFavourites([]));
    }, []);

    const start = async (favourite) => {
        setBusy(favourite.id);
        setError('');
        try {
            const game = await StatsService.startFavourite(favourite.id);
            navigate(game.path);
        } catch (err) {
            setError(err.message);
            setBusy('');
        }
    };
    const change = (favourite) => {
        const [path, memory] = setupOf(favourite);
        saveSetup(memory, { settings: favourite.settings, players: favourite.players.map(id => ({ id })), friendly: false });
        navigate(path);
    };
    const nameOf = (id) => players?.get(id)?.nickname ?? t('Unknown');

    return (
        <Panel header={widget.title} className="h-100">
            {!favourites && <span className="text-faint fs-7">{t('Loading…')}</span>}
            {favourites && !favourites.length &&
                <p className="text-subtle fs-7 m-0">{t('Your favourites appear here once you have played a few games: the same game against the same players, ready to start again with one tap.')}</p>}
            {error && <Message severity="warn" text={error} className="w-100 justify-content-start mb-3" />}
            <ul className="list-unstyled m-0 favourite-list">
                {(favourites ?? []).map(favourite => (
                    <li key={favourite.id} className="favourite">
                        <GameTypeIcon type={favourite.type === 'rules' ? favourite.kind : favourite.type} />
                        <span className="d-flex flex-column min-w-0 flex-grow-1">
                            <span className="text-default fw-semibold text-truncate">
                                {gameTitle(favourite.type === 'rules' ? favourite.kind : favourite.type)}{' '}
                                <span className="text-subtle fw-normal">{t('against {{names}}', { names: favourite.opponents.map(nameOf).join(', ') })}</span>
                            </span>
                            <span className="text-faint fs-8">
                                {[describe(favourite), tn(favourite.count, 'played {{count}} time', 'played {{count}} times'), relativeTime(favourite.lastAt)].filter(Boolean).join(' · ')}
                            </span>
                        </span>
                        <span className="d-flex align-items-center gap-1 flex-shrink-0">
                            <Button type="button" label={t('Change')} size="small" text onClick={() => change(favourite)} className="d-none d-sm-inline-flex" />
                            <Button type="button" icon="pi pi-play" label={t('Play')} size="small" loading={busy === favourite.id} onClick={() => start(favourite)} />
                        </span>
                    </li>
                ))}
                <li className="favourite is-quiet">
                    <GameTypeIcon type="bot" />
                    <span className="d-flex flex-column min-w-0 flex-grow-1">
                        <span className="text-default fw-semibold">{t('X01 against the bot')}</span>
                        <span className="text-faint fs-8">{t('At your own level, whenever nobody else is at the board')}</span>
                    </span>
                    <Link to="/training/x01" className="p-button p-button-sm p-button-secondary text-decoration-none flex-shrink-0"><i className="pi pi-play me-2" />{t('Train')}</Link>
                </li>
            </ul>
        </Panel>
    );
};

export default FavouritesWidget;
