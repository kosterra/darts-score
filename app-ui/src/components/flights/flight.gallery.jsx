import { useId } from 'react';
import { FaLock } from 'react-icons/fa6';

import { FlightPicture } from './flight.art';

const RARITY_LABELS = { starter: 'Starter', common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

// what a tile says under its name: owned, its price, or what is missing
const statusOf = (item) => {
    if (item.state === 'owned') return null;
    if (item.state === 'available') return `${item.cost} points`;
    if (item.state === 'expensive') return `${item.cost} points · ${item.reason}`;
    return item.reason;
};

/**
 * Flights to choose from as tiles, like on the packet: each one upright with
 * its name, framed in the colour of its rarity. Owned ones are chosen with a
 * tap, those to unlock show their price (onUnlock), locked ones what is
 * missing. items: the shapes or designs of the flight standing; preview(item):
 * the flight a tile shows ({ shape, design, color }); selected: the id chosen.
 */
const FlightGallery = ({ label, items, selected, preview, onSelect, onUnlock }) => {
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
                        title={[item.label, RARITY_LABELS[item.rarity], status].filter(Boolean).join(' · ')}
                        onClick={click}
                    >
                        <FlightPicture {...preview(item)} uid={`${uid}-${item.id}`} />
                        {!owned && item.state !== 'available' && <FaLock className="flight-tile-lock" aria-hidden="true" />}
                        <span className="flight-tile-name">{item.label}</span>
                        <span className="flight-tile-status">{status ?? RARITY_LABELS[item.rarity]}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default FlightGallery;
