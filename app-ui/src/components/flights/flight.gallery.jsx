import { useId } from 'react';
import { FaLock } from 'react-icons/fa6';
import { t } from '../../utils/i18n';


const RARITY_LABELS = { starter: t('Starter'), common: t('Common'), rare: t('Rare'), epic: t('Epic'), master: t('Master'), legendary: t('Legendary') };

// what a tile says under its name: its price, or in short what is missing (all of it in the title)
const statusOf = (item) => {
    if (item.state === 'owned') return null;
    if (item.state === 'available') return t('{{cost}} points', { cost: item.cost });
    if (item.state === 'expensive') return t('{{cost}} points · {{reason}}', { cost: item.cost, reason: item.reason });
    return item.short ?? item.reason;
};

/**
 * Flights and barrels to choose from as tiles, like on the packet: each one
 * upright with its name, framed in the colour of its rarity. Owned ones are
 * chosen with a tap. Those that only need points keep their design in full
 * (something to save up for) with a lock in the corner and their price, in
 * gold once it can be paid (a tap unlocks it, onUnlock). Those that first
 * need a level, an average or a feat are greyed out and say what is missing. items: the shapes, designs or barrels of the standing;
 * picture(item, uid): what a tile shows; selected: the id chosen.
 */
const FlightGallery = ({ label, items, selected, picture, onSelect, onUnlock }) => {
    const uid = `gallery-${useId().replace(/:/g, '')}`;
    return (
        <div className="flight-gallery" role="radiogroup" aria-label={label}>
            {items.map(item => {
                const owned = item.state === 'owned';
                const status = statusOf(item);
                const click = () => {
                    if (owned) onSelect(item);
                    else if (item.state === 'available') onUnlock(item);
                };
                return (
                    <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={item.id === selected}
                        aria-disabled={!owned && item.state !== 'available'}
                        className={`flight-tile is-${item.rarity} is-${item.state} ${item.id === selected ? 'is-selected' : ''}`}
                        title={[item.label, RARITY_LABELS[item.rarity], item.cost && t('{{cost}} points', { cost: item.cost }), item.state === 'locked' ? item.reason : item.requires && t('needs {{requires}}', { requires: item.requires })].filter(Boolean).join(' · ')}
                        onClick={click}
                    >
                        {picture(item, `${uid}-${item.id}`)}
                        {!owned && <span className="flight-tile-lock" aria-hidden="true"><FaLock /></span>}
                        <span className="flight-tile-name">{item.label}</span>
                        <span className="flight-tile-status">{status ?? RARITY_LABELS[item.rarity]}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default FlightGallery;
