import { isFormat } from '../../../utils/setup.memory';
import useGamePreferences from '../../../utils/use.game.preferences';
import { t } from '../../../utils/i18n';

const MAX_FAVOURITES = 3;

/**
 * Common formats as pills: one tap sets the whole game up. The pill of the
 * format the game is set up in is highlighted. The player's favourites come
 * first (the pin keeps one there, on every device), then the club's own
 * formats, a friendly one with its mark. onApply(settings, format)
 * game: the game the formats are of, for the favourites
 */
const QuickFormats = ({ game, formats, settings, playerCount, onApply }) => {
    const [preferences, save, loggedIn] = useGamePreferences();
    const keyOf = (format) => format.id ?? format.name;
    const favourites = preferences.favourites[game] ?? [];
    const ordered = [
        ...favourites.map(key => formats.find(format => keyOf(format) === key)).filter(Boolean),
        ...formats.filter(format => !favourites.includes(keyOf(format))),
    ];
    const togglePin = (format) => {
        const key = keyOf(format);
        const next = favourites.includes(key) ? favourites.filter(entry => entry !== key) : [key, ...favourites].slice(0, MAX_FAVOURITES);
        save({ favourites: { ...preferences.favourites, [game]: next } });
    };

    return (
        <div className="setting-box" role="group" aria-label={t('Quick formats')}>
            <p className="setting-title">{t('Quick formats')}</p>
            <div className="quick-formats">
            {ordered.map(format => {
                const active = isFormat(settings, format, playerCount);
                const pinned = favourites.includes(keyOf(format));
                return (
                    <span key={keyOf(format)} className={`quick-format-item ${pinned ? 'is-pinned' : ''}`}>
                        <button
                            type="button"
                            className={`quick-format ${active ? 'is-active' : ''}`}
                            aria-pressed={active}
                            onClick={() => onApply(format.settings, format)}
                        >
                            {format.club && <i className="pi pi-building me-2" aria-hidden="true" title={t('A format of the club')} />}
                            {format.name}
                            {format.friendly && <span className="quick-format-tag">{t('Friendly')}</span>}
                        </button>
                        {/* a favourite comes first, on every device of the player */}
                        {loggedIn && game &&
                            <button
                                type="button"
                                className="quick-format-pin"
                                aria-pressed={pinned}
                                aria-label={pinned ? t('Unpin {{name}}', { name: format.name }) : t('Pin {{name}} first', { name: format.name })}
                                title={pinned ? t('A favourite: comes first. Tap to unpin.') : t('Pin as a favourite: it comes first')}
                                onClick={() => togglePin(format)}
                            >
                                <i className={`pi ${pinned ? 'pi-star-fill' : 'pi-star'}`} aria-hidden="true" />
                            </button>}
                    </span>
                );
            })}
            </div>
        </div>
    );
};

export default QuickFormats;
