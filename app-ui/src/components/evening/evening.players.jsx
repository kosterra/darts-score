import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import dayjs from 'dayjs';

import EveningService from '../../services/evening.service';
import { t } from '../../utils/i18n';

// an evening has 8 players at most (as when it starts)
const MAX_PLAYERS = 8;

/**
 * Who is here tonight, above the next game: someone arriving later is added
 * by name, who goes home is no longer chosen for a game (their games keep
 * counting) and can come back. onChange(evening), onError(message).
 */
const EveningPlayers = ({ evening, onChange, onError }) => {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const run = async (work) => {
        setBusy(true);
        try {
            onChange(await work());
            return true;
        } catch (err) {
            onError(err.message);
            return false;
        } finally {
            setBusy(false);
        }
    };
    const add = async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        if (await run(() => EveningService.addPlayer(evening.id, name.trim()))) setName('');
    };
    const time = (date) => dayjs(date).format('HH:mm');

    return (
        <div className="evening-players">
            <p className="game-setup-section-title">{t('Here tonight')}</p>
            <p className="text-faint fs-8 mt-0">{t('Someone arriving? Add them. Who goes home is no longer suggested; their games keep counting.')}</p>
            <div className="d-flex flex-wrap align-items-center gap-2">
                {evening.players.map(player => (
                    <span key={player.id} className={`club-night-chip evening-player-chip ${player.leftAt ? 'is-gone' : ''}`}>
                        <span className="d-flex flex-column">
                            <span>{player.name}</span>
                            {player.leftAt
                                ? <span className="evening-player-note">{t('went home at {{time}}', { time: time(player.leftAt) })}</span>
                                : player.joinedAt && <span className="evening-player-note">{t('came at {{time}}', { time: time(player.joinedAt) })}</span>}
                        </span>
                        {player.leftAt
                            ? <button type="button" disabled={busy} aria-label={t('{{name}} is back', { name: player.name })} title={t('Back')} onClick={() => run(() => EveningService.setPlayerLeft(evening.id, player.id, false))}><i className="pi pi-replay" aria-hidden="true" /></button>
                            : <button type="button" disabled={busy} aria-label={t('{{name}} went home', { name: player.name })} title={t('Gone home')} onClick={() => run(() => EveningService.setPlayerLeft(evening.id, player.id, true))}><i className="pi pi-sign-out" aria-hidden="true" /></button>}
                    </span>
                ))}
                {evening.players.length < MAX_PLAYERS &&
                    <form className="evening-player-add" onSubmit={add}>
                        <InputText value={name} onChange={(event) => setName(event.target.value)} maxLength={20} placeholder={t('Name')} aria-label={t('Name of the player arriving')} className="p-inputtext-sm" />
                        <Button type="submit" label={t('Add')} icon="pi pi-user-plus" size="small" outlined loading={busy} disabled={!name.trim()} />
                    </form>}
            </div>
        </div>
    );
};

export default EveningPlayers;
