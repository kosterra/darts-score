import { useMemo, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import QuickSettings from '../quick/quick.settings';
import { suggestNext } from '../../utils/evening.next';
import { QUICK_DEFAULTS, quickSetupText } from '../../utils/quick.games';
import { resolvePlayerInitials } from '../../utils/image.utils';
import { t, tn } from '../../utils/i18n';

// the setup of the next game, remembered per evening in this browser
const setupKey = (id) => `darts-score.evening.${id}.setup`;
const readSetup = (id) => {
    try {
        return JSON.parse(localStorage.getItem(setupKey(id)) ?? 'null');
    } catch {
        return null;
    }
};
const keepSetup = (id, setup) => {
    try {
        localStorage.setItem(setupKey(id), JSON.stringify(setup));
    } catch {
        // the next game starts from the defaults then
    }
};

/**
 * The next game: who plays (suggested, or tapped in the order they throw)
 * and the game with its few settings; Start opens it.
 */
const NextGame = ({ evening, onStart, busy }) => {
    const [settings, setSettings] = useState(() => ({ ...QUICK_DEFAULTS, ...(readSetup(evening.id) ?? {}) }));
    const [size, setSize] = useState(2);
    const suggestion = useMemo(() => suggestNext(evening.players, evening.games, size), [evening.players, evening.games, size]);
    const [chosen, setChosen] = useState(null);
    const players = chosen ?? suggestion;
    const toggle = (id) => setChosen(current => {
        const list = current ?? suggestion;
        if (list.includes(id)) return list.filter(entry => entry !== id);
        return list.length >= 4 ? list : [...list, id];
    });
    const nameOf = (id) => evening.players.find(player => player.id === id)?.name ?? '?';
    const change = (changes) => setSettings(current => {
        const next = { ...current, ...changes };
        keepSetup(evening.id, next);
        return next;
    });
    const ready = players.length >= 2 && players.length <= 4;

    // games played tonight by each, under their name
    const playedBy = (id) => evening.games.filter(game => game.finished && game.players.includes(id)).length;

    return (
        <div className="evening-next page-narrow">
            <p className="game-setup-section-title">{t('Players')}</p>
            <p className="text-faint fs-8 mt-0">{chosen ? t('Tap the players in the order they throw (2 to 4).') : t('Suggested: who played least, against someone new. Tap to choose others.')}</p>
            {/* the cards of the setup pages, numbered in the order they throw */}
            <div className="player-picker-grid" role="group" aria-label={t('Players of the evening')}>
                {evening.players.map(player => {
                    const place = players.indexOf(player.id);
                    const played = playedBy(player.id);
                    return (
                        <button key={player.id} type="button" className={`player-pick-card ${place >= 0 ? 'is-chosen' : ''}`} onClick={() => toggle(player.id)} aria-pressed={place >= 0}>
                            {place >= 0 && <span className="player-pick-number" aria-label={t('Throws {{value}}.', { value: place + 1 })}>{place + 1}</span>}
                            <Avatar label={resolvePlayerInitials(player.name, '')} shape="circle" className="avatar-md" />
                            <span className="player-pick-name">{player.name}</span>
                            <span className="player-pick-detail">{played ? tn(played, '{{count}} game played', '{{count}} games played') : t('Not played yet')}</span>
                        </button>
                    );
                })}
            </div>
            {chosen
                ? <Button type="button" label={t('Back to the suggestion')} icon="pi pi-replay" size="small" text className="mt-2" onClick={() => setChosen(null)} />
                : <div className="mt-3">
                    <p className="setting-title">{t('Players in a game')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col d-flex justify-content-center">
                            <SelectButton
                                value={size}
                                options={[2, 3, 4].filter(count => count <= evening.players.length).map(count => ({ label: String(count), value: count }))}
                                onChange={(e) => e.value && setSize(e.value)}
                                className="p-selectbutton-pills flex-wrap"
                                aria-label={t('Players in a game')}
                            />
                        </div>
                    </div>
                </div>}
            <p className="game-setup-section-title mt-4">{t('Game')}</p>
            <div className="evening-settings">
                <QuickSettings settings={settings} onChange={change} />
            </div>
            <div className="game-setup-start">
                <Button type="button" label={t('Start the game')} icon="pi pi-play" loading={busy} disabled={!ready} onClick={() => onStart(settings, players.map(id => ({ id, nickname: nameOf(id) })))} />
                <span className="game-setup-summary">{ready ? `${players.map(nameOf).join(' – ')} · ${quickSetupText(settings.kind, settings)}` : t('Choose 2 to 4 players')}</span>
            </div>
        </div>
    );
};

export default NextGame;
