import { useState } from 'react';
import { SelectButton } from 'primereact/selectbutton';

import PlayerService from '../../services/player.service';
import DartSide from './dart.side';
import SettingSwitch from '../elements/setting.switch';
import { FLIGHT_COLORS, FLIGHT_PATTERNS, FLIGHT_SHAPES, flightOf } from '../../utils/flights';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';

const DEFAULTS = { flyingDarts: true, flightColor: 'auto', flightPattern: 'plain', flightShape: 'standard' };

/**
 * How a player's darts look on the board of X01, Cricket and Elimination,
 * in the boxes of the game setup: the dart animation (a game can switch it
 * on or off for everyone), and the colour, shape and pattern of the flights, with a
 * dart turning slowly to see them. A change is saved right away.
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
    const animated = preferences.flyingDarts !== false;

    return (
        <>
            <SettingSwitch
                id={`player-dart-animation-${player.id}`}
                title="Dart animation"
                hint={animated
                    ? 'A dart flies to the field you tap and sticks in the board. A game can switch it off for everyone.'
                    : 'The field you tap just lights up. A game can switch the animation on for everyone.'}
                checked={animated}
                onChange={(value) => save({ flyingDarts: value })}
            />

            <div>
                <p className="setting-title">Flights</p>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col d-flex flex-column gap-3">
                        <div className="player-flight-preview">
                            <DartSide color={flight.color} pattern={flight.pattern} shape={flight.shape} />
                        </div>
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
                                {preferences.flightColor === 'auto' ? 'In your colour of the game, as on the scores and charts.' : 'The same colour in every game.'}
                            </span>
                        </div>
                        <div className="d-flex flex-column gap-2">
                            <span className="text-subtle fs-8">Shape</span>
                            <SelectButton
                                value={preferences.flightShape}
                                options={FLIGHT_SHAPES}
                                onChange={(e) => e.value && save({ flightShape: e.value })}
                                className="p-selectbutton-pills flex-wrap"
                                aria-label="Flight shape"
                            />
                        </div>
                        <div className="d-flex flex-column gap-2">
                            <span className="text-subtle fs-8">Pattern</span>
                            <SelectButton
                                value={preferences.flightPattern}
                                options={FLIGHT_PATTERNS}
                                onChange={(e) => e.value && save({ flightPattern: e.value })}
                                className="p-selectbutton-pills flex-wrap"
                                aria-label="Flight pattern"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PlayerDartPreferences;
