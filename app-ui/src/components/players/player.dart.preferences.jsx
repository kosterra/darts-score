import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

import PlayerService from '../../services/player.service';
import DartSide from './dart.side';
import SettingSwitch from '../elements/setting.switch';
import FlightGallery from '../flights/flight.gallery';
import { FlightPicture } from '../flights/flight.art';
import { BarrelPicture } from '../flights/barrel.art';
import { FLIGHT_COLORS, flightOf } from '../../utils/flights';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';

const DEFAULTS = { flyingDarts: true, flightColor: 'auto', flightPattern: 'plain', flightShape: 'standard', barrel: 'classic' };

/**
 * How a player's darts look on the board of X01, Cricket and Elimination,
 * in the boxes of the game setup: the dart animation (a game can switch it
 * on or off for everyone), and the flights: a dart turning slowly, the
 * colour, and the shapes and designs as tiles. The player's flight points,
 * earned by playing and training, unlock more of them. A change is saved
 * right away.
 *
 * player: { id, preferences }
 * clubId: the club the player is edited in
 */
const PlayerDartPreferences = ({ player, clubId, onSaved, onError }) => {
    const [preferences, setPreferences] = useState({ ...DEFAULTS, ...player.preferences });
    // the flight points and what is owned, to unlock or locked
    const [standing, setStanding] = useState(null);
    const [standingFailed, setStandingFailed] = useState(false);
    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        let current = true;
        PlayerService.loadFlights(player.id, clubId)
            .then(loaded => { if (current) setStanding(loaded); })
            .catch(() => { if (current) setStandingFailed(true); });
        return () => { current = false; };
    }, [player.id, clubId]);

    const save = async (change) => {
        const before = preferences;
        setPreferences(current => ({ ...current, ...change }));
        try {
            onSaved?.(await PlayerService.setPreferences(player.id, change, clubId));
        } catch (error) {
            setPreferences(before);
            onError?.(error);
        }
    };

    const preferenceOf = (kind) => ({ shape: 'flightShape', design: 'flightPattern', barrel: 'barrel' })[kind];
    const unlock = (item) => confirmDialog({
        header: `Unlock ${item.label}`,
        message: `Unlock ${item.kind === 'barrel' ? 'the barrel' : `the ${item.kind}`} ${item.label} for ${item.cost} flight points? You have ${standing.points.balance}.`,
        acceptLabel: 'Unlock',
        rejectLabel: 'Cancel',
        acceptClassName: 'p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: async () => {
            try {
                setStanding(await PlayerService.unlockFlight(player.id, item.kind, item.id, clubId));
                await save({ [preferenceOf(item.kind)]: item.id });
            } catch (error) {
                onError?.(error);
            }
        },
    });

    const flight = flightOf({ preferences });
    const design = standing?.designs.find(item => item.id === flight.design);
    const owned = (items) => items.filter(item => item.state === 'owned').length;

    return (
        <>
            <SettingSwitch
                id={`player-dart-animation-${player.id}`}
                title="Dart animation"
                hint={preferences.flyingDarts !== false
                    ? 'A dart flies to the field you tap and sticks in the board. A game can switch it off for everyone.'
                    : 'The field you tap just lights up. A game can switch the animation on for everyone.'}
                checked={preferences.flyingDarts !== false}
                onChange={(value) => save({ flyingDarts: value })}
            />

            <div>
                <p className="setting-title">Flights and barrels</p>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col d-flex flex-column gap-3">
                        <div className="player-flight-preview">
                            {/* standing still for now; spin turns it slowly round its axis */}
                            <DartSide color={flight.color} shape={flight.shape} design={flight.design} barrel={flight.barrel} spin={false} diagonal />
                        </div>

                        {standing && (
                            <div className="flight-points">
                                <div className="d-flex flex-wrap align-items-baseline gap-2">
                                    <span className="flight-points-balance">{standing.points.balance}</span>
                                    <span className="text-default fs-7 fw-semibold">flight points</span>
                                    <span className="text-faint fs-8">· {standing.points.earned} earned, {standing.points.spent} spent · {owned(standing.shapes) + owned(standing.designs) + owned(standing.barrels)} of {standing.shapes.length + standing.designs.length + standing.barrels.length} collected</span>
                                </div>
                                <span className="text-faint fs-8">
                                    {standing.levelName && <>You are {standing.levelName}{standing.average != null ? `, with an X01 average of ${standing.average}` : ', without an X01 average yet (it counts from 5 X01 games)'}. </>}
                                    Earned by playing and training: unlock the flight shapes, designs and barrels you like with them. Many also need a player level or an X01 average; the master flights belong to the levels, the legendary ones only come with a feat.
                                    {' '}
                                    <Button type="button" link className="p-0 fs-8 align-baseline" label={showRules ? 'Hide how' : 'How do I earn them?'} onClick={() => setShowRules(shown => !shown)} />
                                </span>
                                {showRules && (
                                    <dl className="flight-points-rules">
                                        {standing.points.breakdown.map(rule => (
                                            <div key={rule.id}>
                                                <dt>{rule.label}</dt>
                                                <dd>{rule.per} each <span className="text-faint">· {rule.count} so far, {rule.points} points</span></dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </div>
                        )}
                        {standingFailed && <span className="text-faint fs-8">The flights you can unlock could not be loaded. Please reload the page.</span>}

                        <div className="d-flex flex-column gap-2">
                            <span className="text-subtle fs-8">Colour</span>
                            <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Flight colour">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={preferences.flightColor === 'auto'}
                                    className={`flight-swatch ${preferences.flightColor === 'auto' ? 'is-selected' : ''}`}
                                    style={{ background: `conic-gradient(${PLAYER_COLORS.map((color, index) => `${color} ${index * 25}% ${(index + 1) * 25}%`).join(', ')})` }}
                                    title="My colour in the game"
                                    aria-label="My colour in the game"
                                    onClick={() => save({ flightColor: 'auto' })}
                                />
                                {FLIGHT_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={preferences.flightColor === color.value}
                                        className={`flight-swatch ${preferences.flightColor === color.value ? 'is-selected' : ''}`}
                                        style={{ background: color.value }}
                                        title={color.label}
                                        aria-label={color.label}
                                        onClick={() => save({ flightColor: color.value })}
                                    />
                                ))}
                            </div>
                            <span className="text-faint fs-8">
                                {design && !design.colorable
                                    ? `${design.label} has colours of its own; the colour is for the other designs.`
                                    : preferences.flightColor === 'auto' ? 'In your colour of the game, as on the scores and charts.' : 'The same colour in every game.'}
                            </span>
                        </div>

                        {standing && (
                            <>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">Shape · {owned(standing.shapes)} of {standing.shapes.length}</span>
                                    <FlightGallery
                                        label="Flight shape"
                                        items={standing.shapes}
                                        selected={flight.shape}
                                        picture={(item, uid) => <FlightPicture shape={item.id} design={flight.design} color={flight.color} uid={uid} />}
                                        onSelect={(item) => save({ flightShape: item.id })}
                                        onUnlock={unlock}
                                    />
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">Design · {owned(standing.designs)} of {standing.designs.length}</span>
                                    <FlightGallery
                                        label="Flight design"
                                        items={standing.designs}
                                        selected={flight.design}
                                        picture={(item, uid) => <FlightPicture shape={flight.shape} design={item.id} color={flight.color} uid={uid} />}
                                        onSelect={(item) => save({ flightPattern: item.id })}
                                        onUnlock={unlock}
                                    />
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">Barrel · {owned(standing.barrels)} of {standing.barrels.length}</span>
                                    <FlightGallery
                                        label="Barrel"
                                        items={standing.barrels}
                                        selected={flight.barrel}
                                        picture={(item, uid) => <BarrelPicture barrel={item.id} uid={uid} />}
                                        onSelect={(item) => save({ barrel: item.id })}
                                        onUnlock={unlock}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmDialog />
        </>
    );
};

export default PlayerDartPreferences;
