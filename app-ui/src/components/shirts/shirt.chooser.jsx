import { useEffect, useRef, useState } from 'react';

import PlayerService from '../../services/player.service';
import FlightGallery from '../flights/flight.gallery';
import { ShirtPicture } from './shirt.art';
import { FLIGHT_COLORS } from '../../utils/flights';
import useAutoSave from '../../utils/use.auto.save';
import { t } from '../../utils/i18n';

// the tiles framed as the flights: the club shirt as a starter, those of the levels as master, the Legend's as legendary
const rarityOf = (design) => (design.level === 1 ? 'starter' : design.level >= 8 ? 'legendary' : 'master');

export const Swatches = ({ label, value, onChange }) => (
    <div className="d-flex flex-column gap-2">
        <span className="text-subtle fs-8">{label}</span>
        <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
            {FLIGHT_COLORS.map(color => (
                <button
                    key={color.value}
                    type="button"
                    role="radio"
                    aria-checked={value === color.value}
                    className={`flight-swatch ${value === color.value ? 'is-selected' : ''}`}
                    style={{ background: color.value }}
                    title={color.label}
                    aria-label={color.label}
                    onClick={() => onChange(color.value)}
                />
            ))}
        </div>
    </div>
);

/**
 * A player's shirt, in the boxes of their player: everyone wears the shirt
 * of their club; from the level Pro on one of their own with their nickname
 * on the back, every design free, more with World Class and Legend. Below
 * Pro the designs wait greyed out, as a goal. A choice is shown and saved at
 * once; onStatus(autosave) tells the page how the saving goes.
 *
 * player: { id, nickname }; club: { name, accent } of the club shown; clubId: the club the player is edited in
 */
const ShirtChooser = ({ player, club, clubId, onStatus }) => {
    const [standing, setStanding] = useState(null);
    const [failed, setFailed] = useState(false);
    // what was chosen here, sent together (one save at a time, the newest wins)
    const chosen = useRef({});
    const shirtSave = useAutoSave(async (shirt) => {
        const saved = await PlayerService.setShirt(player.id, shirt, clubId);
        // the designs the level opens from the answer, the shirt as chosen meanwhile
        setStanding({ ...saved, shirt: { ...saved.shirt, ...chosen.current } });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onStatus?.(shirtSave), [shirtSave.status, shirtSave.error]);

    useEffect(() => {
        let current = true;
        PlayerService.loadShirt(player.id, clubId)
            .then(loaded => { if (current) setStanding(loaded); })
            .catch(() => { if (current) setFailed(true); });
        return () => { current = false; };
    }, [player.id, clubId]);

    if (failed) return <span className="text-faint fs-8">{t('The shirts could not be loaded. Please reload the page.')}</span>;
    if (!standing) return null;

    const save = (change) => {
        chosen.current = { ...chosen.current, ...change };
        setStanding(current => ({ ...current, shirt: { ...current.shirt, ...change } }));
        shirtSave.change(chosen.current, { now: true });
    };

    const { shirt } = standing;
    const pro = standing.designs.find(design => design.level > 1);
    const ownOpen = standing.designs.some(design => design.level > 1 && design.owned);
    const items = standing.designs.map(design => ({
        id: design.id,
        label: design.label,
        rarity: rarityOf(design),
        state: design.owned ? 'owned' : 'locked',
        short: design.levelName ? t('From {{level}}', { level: design.levelName }) : null,
        reason: design.levelName ? t('Opens with the level {{level}}', { level: design.levelName }) : null,
    }));
    const look = { color: shirt.color, accent: shirt.accent, nickname: player.nickname, club };

    return (
        <div className="d-flex flex-column gap-3">
            <div className="shirt-preview">
                <ShirtPicture design={shirt.design} {...look} uid={`shirt-preview-${player.id}`} />
            </div>
            <span className="text-faint fs-8">
                {ownOpen
                    ? t('Your level opens shirts of your own with your nickname on the back: every design is free. Or play in the shirt of your club.')
                    : t('You play in the shirt of your club. From the level {{level}} on you get a shirt of your own with your nickname on the back, as the pros wear it: every design free, more with the levels above.', { level: pro?.levelName ?? 'Pro' })}
            </span>
            <FlightGallery
                label={t('Shirt')}
                items={items}
                selected={shirt.design}
                picture={(item, uid) => <ShirtPicture design={item.id} {...look} uid={uid} />}
                onSelect={(item) => save({ design: item.id })}
                onUnlock={() => {}}
            />
            {ownOpen && shirt.design !== 'club' &&
                <>
                    <Swatches label={t('Main colour')} value={shirt.color} onChange={(color) => save({ color })} />
                    <Swatches label={t('Second colour')} value={shirt.accent} onChange={(accent) => save({ accent })} />
                </>}
        </div>
    );
};

export default ShirtChooser;
