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
import { t } from '../../utils/i18n';

const DEFAULTS = { flyingDarts: false, flightColor: 'auto', flightPattern: 'plain', flightShape: 'standard', barrel: 'classic' };

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
        header: t('Unlock {{label}}', { label: item.label }),
        message: t({
            shape: 'Unlock the shape {{label}} for {{cost}} flight points? You have {{balance}}.',
            design: 'Unlock the design {{label}} for {{cost}} flight points? You have {{balance}}.',
            barrel: 'Unlock the barrel {{label}} for {{cost}} flight points? You have {{balance}}.',
        }[item.kind], { label: item.label, cost: item.cost, balance: standing.points.balance }),
        acceptLabel: t('Unlock'),
        rejectLabel: t('Cancel'),
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
                title={t('Dart animation')}
                hint={preferences.flyingDarts === true
                    ? t('A dart flies to the field you tap and sticks in the board. A game can switch it off for everyone.')
                    : t('The field you tap just lights up. A game can switch the animation on for everyone.')}
                checked={preferences.flyingDarts === true}
                onChange={(value) => save({ flyingDarts: value })}
            />

            <div>
                <p className="setting-title">{t('Flights and barrels')}</p>
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
                                    <span className="text-default fs-7 fw-semibold">{t('flight points')}</span>
                                    <span className="text-faint fs-8">· {standing.points.earned}{' '}{t('earned,')}{' '}{standing.points.spent}{' '}{t('spent ·')}{' '}{owned(standing.shapes) + owned(standing.designs) + owned(standing.barrels)}{' '}{t('of')}{' '}{standing.shapes.length + standing.designs.length + standing.barrels.length}{' '}{t('collected')}</span>
                                </div>
                                <span className="text-faint fs-8">
                                    {standing.levelName && <>{t('You are')}{' '}{standing.levelName}{standing.average != null ? t(', with an X01 average of {{average}}', { average: standing.average }) : t(', without an X01 average yet (it counts from 5 X01 games)')}. </>}
                                    {t('Earned by playing and training: unlock the flight shapes, designs and barrels you like with them. Many also need a player level or an X01 average; the master flights belong to the levels, the legendary ones only come with a feat.')}
                                    {' '}
                                    <Button type="button" link className="p-0 fs-8 align-baseline" label={showRules ? t('Hide how') : t('How do I earn them?')} onClick={() => setShowRules(shown => !shown)} />
                                </span>
                                {showRules && (
                                    <dl className="flight-points-rules">
                                        {standing.points.breakdown.map(rule => (
                                            <div key={rule.id}>
                                                <dt>{rule.label}</dt>
                                                <dd>{rule.per}{' '}{t('each')}{' '}<span className="text-faint">· {rule.count}{' '}{t('so far,')}{' '}{rule.points}{' '}{t('points')}</span></dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </div>
                        )}
                        {standingFailed && <span className="text-faint fs-8">{t('The flights you can unlock could not be loaded. Please reload the page.')}</span>}

                        <div className="d-flex flex-column gap-2">
                            <span className="text-subtle fs-8">{t('Colour')}</span>
                            <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label={t('Flight colour')}>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={preferences.flightColor === 'auto'}
                                    className={`flight-swatch ${preferences.flightColor === 'auto' ? 'is-selected' : ''}`}
                                    style={{ background: `conic-gradient(${PLAYER_COLORS.map((color, index) => `${color} ${index * 25}% ${(index + 1) * 25}%`).join(', ')})` }}
                                    title={t('My colour in the game')}
                                    aria-label={t('My colour in the game')}
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
                                    ? t('{{label}} has colours of its own; the colour is for the other designs.', { label: design.label })
                                    : preferences.flightColor === 'auto' ? t('In your colour of the game, as on the scores and charts.') : t('The same colour in every game.')}
                            </span>
                        </div>

                        {standing && (
                            <>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">{t('Shape ·')}{' '}{owned(standing.shapes)}{' '}{t('of')}{' '}{standing.shapes.length}</span>
                                    <FlightGallery
                                        label={t('Flight shape')}
                                        items={standing.shapes}
                                        selected={flight.shape}
                                        picture={(item, uid) => <FlightPicture shape={item.id} design={flight.design} color={flight.color} uid={uid} />}
                                        onSelect={(item) => save({ flightShape: item.id })}
                                        onUnlock={unlock}
                                    />
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">{t('Design ·')}{' '}{owned(standing.designs)}{' '}{t('of')}{' '}{standing.designs.length}</span>
                                    <FlightGallery
                                        label={t('Flight design')}
                                        items={standing.designs}
                                        selected={flight.design}
                                        picture={(item, uid) => <FlightPicture shape={flight.shape} design={item.id} color={flight.color} uid={uid} />}
                                        onSelect={(item) => save({ flightPattern: item.id })}
                                        onUnlock={unlock}
                                    />
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <span className="text-subtle fs-8">{t('Barrel ·')}{' '}{owned(standing.barrels)}{' '}{t('of')}{' '}{standing.barrels.length}</span>
                                    <FlightGallery
                                        label={t('Barrel')}
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
