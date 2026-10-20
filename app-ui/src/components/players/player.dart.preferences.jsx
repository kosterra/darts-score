import { useState } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';

import PlayerService from '../../services/player.service';
import Dart from '../games/common/dart.shape';
import { FLIGHT_COLORS, FLIGHT_PATTERNS, flightOf } from '../../utils/flights';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';

const DEFAULTS = { flyingDarts: true, flightColor: 'auto', flightPattern: 'plain' };

/**
 * How a player's darts look in X01: whether they fly onto the board (a game
 * can switch them on or off for everyone), and the colour and pattern of
 * their flights, with a dart to see it. A change is saved right away.
 *
 * player: { id, preferences }
 * clubId: the club the player is edited in
 */
const PlayerDartPreferences = ({ player, clubId, onSaved, onError }) => {
    const [preferences, setPreferences] = useState({ ...DEFAULTS, ...player.preferences });

    const save = async (change) => {
        const before = preferences;
        setPreferences({ ...preferences, ...change });
        try {
            onSaved?.(await PlayerService.setPreferences(player.id, change, clubId));
        } catch (error) {
            setPreferences(before);
            onError?.(error);
        }
    };

    const flight = flightOf({ preferences });
    const id = `player-flying-darts-${player.id}`;

    return (
        <div className="player-dart-preferences">
            <div className="my-club-public">
                <label htmlFor={id} className="d-flex flex-column">
                    <span className="text-default fs-7">Dart animation</span>
                    <span className="text-faint fs-8">
                        {preferences.flyingDarts
                            ? 'A dart flies to the field you tap and sticks in the board. A game can switch it off for everyone.'
                            : 'The field you tap just lights up. A game can switch the animation on for everyone.'}
                    </span>
                </label>
                <InputSwitch inputId={id} checked={preferences.flyingDarts !== false} onChange={(event) => save({ flyingDarts: event.value })} />
            </div>

            <div className="player-flight">
                <svg className="player-flight-preview" viewBox="-38 -98 76 112" role="img" aria-label={`A dart with ${FLIGHT_PATTERNS.find(pattern => pattern.value === flight.pattern)?.label.toLowerCase()} flights`}>
                    {/* as it sticks in the board: the flights above the tip */}
                    <g transform="scale(1, -1)"><Dart color={flight.color} pattern={flight.pattern} scale={3} /></g>
                </svg>
                <div className="d-flex flex-column gap-3 flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-8">Flight colour</span>
                        <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Flight colour">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={preferences.flightColor === 'auto'}
                                className={`flight-swatch is-auto ${preferences.flightColor === 'auto' ? 'is-selected' : ''}`}
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
                            {preferences.flightColor === 'auto' ? 'In your colour of the game, as on the scores and charts.' : 'The same colour in every game.'}
                        </span>
                    </div>
                    <div className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-8">Pattern</span>
                        <SelectButton
                            value={preferences.flightPattern}
                            options={FLIGHT_PATTERNS}
                            onChange={(e) => e.value && save({ flightPattern: e.value })}
                            className="p-selectbutton-pills pills-fit flex-wrap"
                            aria-label="Flight pattern"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDartPreferences;
