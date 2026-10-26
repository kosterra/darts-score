import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';

import DeletePopup from '../elements/delete.popup';
import { discardUnsent, useUnsentGames } from '../../utils/unsent.games';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';

/**
 * On top of the other pages: games scored without a connection that are not
 * on the server yet. Opening one sends it; one the server no longer takes
 * (e.g. deleted meanwhile) can be given up.
 */
const UnsentGamesNote = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const games = useUnsentGames().filter(entry => entry.link !== pathname);
    const [open, setOpen] = useState(false);
    if (!games.length) return null;

    return (
        <div className="unsent-games" role="status">
            <div className="unsent-games-head">
                <i className="pi pi-cloud-upload" aria-hidden="true" />
                <span className="flex-grow-1">
                    {games.length === 1 ? t('A game is not sent yet: it is kept on this device.') : t('{{count}} games are not sent yet: they are kept on this device.', { count: games.length })}
                </span>
                {games.length === 1
                    ? <Button type="button" label={t('Open and send')} size="small" onClick={() => navigate(games[0].link)} />
                    : <Button type="button" label={open ? t('Hide') : t('Show')} size="small" severity="secondary" onClick={() => setOpen(!open)} />}
            </div>
            {(open || games.length === 1) &&
                <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                    {games.map(entry => (
                        <li key={entry.key} className="unsent-game">
                            <span className="flex-grow-1">
                                <strong>{entry.kind ?? t('Game')}</strong>
                                {entry.players?.length > 0 && <> · {entry.players.map(player => player.nickname).join(', ')}</>}
                                <span className="text-faint"> · {formatDate(entry.at, { time: true })}</span>
                            </span>
                            {games.length > 1 && <Button type="button" label={t('Open and send')} size="small" onClick={() => navigate(entry.link)} />}
                            <DeletePopup
                                header={t('Give up this game')}
                                message={t('the game kept on this device; it is not sent any more')}
                                handleDelete={() => discardUnsent(entry.key)}
                                size="small"
                            />
                        </li>
                    ))}
                </ul>
            }
        </div>
    );
};

export default UnsentGamesNote;
