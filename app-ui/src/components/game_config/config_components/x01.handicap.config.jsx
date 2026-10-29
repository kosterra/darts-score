import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';
import StatsService from '../../../services/stats.service';
import { ageOn, suggestHandicap, X01_STARTING_SCORES } from '../../../utils/handicap';
import { t } from '../../../utils/i18n';

const SCORES = X01_STARTING_SCORES.map(score => ({ label: String(score), value: score }));
const IN_MODES = SetsLegsConfigOptions.legInOptions.values.map(option => ({ label: option.value, value: option.value }));
const OUT_MODES = SetsLegsConfigOptions.legOutOptions.values.map(option => ({ label: option.value, value: option.value }));

const rulesOfGame = (game) => ({ startingScore: Number(game.startingScore), legInMode: game.legInMode, legOutMode: game.legOutMode });

/**
 * A handicap for players of different strength: each player gets their own
 * starting score and in/out mode. The suggestion from each player's recent
 * average, level and age is filled in by itself, when it is switched on and
 * when the players change, until a value is changed by hand; then one click
 * goes back to it. Players without a date of birth (guests) get an age field.
 *
 * game: the game's settings, players: the chosen players
 * rules: { [playerId]: { startingScore, legInMode, legOutMode } } or null when off
 * onChange(rules | null)
 * suggest: whether the club offers the suggestion; maxDifference: the most points the
 * starting scores may differ by (0: no limit); declined: the nicknames of players who
 * play without a handicap
 */
const X01HandicapConfig = ({ game, players, rules, onChange, suggest = true, maxDifference = 0, declined = [] }) => {
    const [form, setForm] = useState({});
    const [levels, setLevels] = useState({});
    const [ages, setAges] = useState({});
    // the players whose figures are in (the suggestion waits for them), and whether a value was changed by hand
    const [loadedFor, setLoadedFor] = useState('');
    const [byHand, setByHand] = useState(false);
    const enabled = rules !== null;
    const playerIds = players.map(player => player.id).join(',');

    useEffect(() => {
        if (!enabled || !players.length) return;
        let current = true;
        const ids = players.filter(player => !player.guest).map(player => player.id);
        Promise.all([
            ids.length ? StatsService.loadPlayersForm(ids).catch(() => ({})) : {},
            StatsService.loadPlayerLevels().catch(() => ({})),
        ]).then(([loadedForm, loadedLevels]) => {
            if (!current) return;
            setForm(loadedForm ?? {});
            setLevels(loadedLevels ?? {});
            setLoadedFor(playerIds);
        });
        return () => { current = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, playerIds]);

    const ageOf = (player) => ageOn(player.dateOfBirth) ?? ages[player.id] ?? null;

    const suggestion = useMemo(() => suggestHandicap(game, players.map(player => ({
        id: player.id,
        age: ageOf(player),
        recentAverage: form[player.id]?.recentAverage ?? null,
        games: form[player.id]?.games ?? 0,
        levelId: levels[player.id]?.id ?? null,
    }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.startingScore, game.legInMode, game.legOutMode, playerIds, form, levels, ages]);

    // a player chosen after switching it on starts with the game's settings
    const ruleOf = (playerId) => rules?.[playerId] ?? rulesOfGame(game);

    const setRule = (playerId, name, value) => {
        setByHand(true);
        onChange({ ...rules, [playerId]: { ...ruleOf(playerId), [name]: value } });
    };

    const apply = () => onChange(Object.fromEntries(players.map(player => {
        const { startingScore, legInMode, legOutMode } = suggestion[player.id];
        return [player.id, { startingScore, legInMode, legOutMode }];
    })));

    const isSuggested = players.every(player => {
        const rule = ruleOf(player.id);
        const suggested = suggestion[player.id];
        return suggested && rule.startingScore === suggested.startingScore
            && rule.legInMode === suggested.legInMode && rule.legOutMode === suggested.legOutMode;
    });

    // other players: the suggestion counts again
    useEffect(() => { setByHand(false); }, [playerIds]);
    // the suggestion filled in by itself, once the players' figures are in, unless changed by hand
    const ready = suggest && enabled && players.length >= 2 && loadedFor === playerIds && players.every(player => suggestion[player.id]);
    useEffect(() => {
        if (ready && !byHand && !isSuggested) apply();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, byHand, isSuggested]);

    return (
        <div className="x01-handicap mb-4">
            <div className="d-flex align-items-center gap-3">
                <InputSwitch
                    inputId="x01-handicap"
                    checked={enabled}
                    disabled={players.length < 2 || declined.length > 0}
                    onChange={(e) => onChange(e.value ? Object.fromEntries(players.map(player => [player.id, rulesOfGame(game)])) : null)}
                />
                <label htmlFor="x01-handicap" className="d-flex flex-column">
                    <span className="text-default fw-semibold">{t('Handicap')}</span>
                    <span className="text-faint fs-8">
                        {players.length < 2
                            ? t('Choose the players first.')
                            : declined.length
                                ? t('{{names}} play without a handicap.', { names: declined.join(', ') })
                                : t('Own starting score and in/out per player, for players of different strength.')}
                        {maxDifference > 0 && players.length >= 2 && !declined.length && <> {t('The club allows a difference of {{points}} points at most.', { points: maxDifference })}</>}
                    </span>
                </label>
            </div>

            {enabled && players.length >= 2 &&
                <div className="x01-handicap-players mt-3">
                    {suggest && <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                        <span className="text-faint fs-8">
                            {isSuggested || !byHand
                                ? t('Suggested from each player\'s recent average, level and age.')
                                : t('Changed by hand.')}
                        </span>
                        {byHand && !isSuggested &&
                            <Button type="button" icon="pi pi-sparkles" label={t('Back to the suggestion')} size="small" severity="secondary" onClick={() => { setByHand(false); apply(); }} />}
                    </div>}
                    {players.map(player => {
                        const rule = ruleOf(player.id);
                        const needsAge = !player.dateOfBirth;
                        return (
                            <div key={player.id} className="x01-handicap-player">
                                <div className="x01-handicap-who">
                                    <span className="text-default fw-semibold">{player.nickname}</span>
                                    {suggest && <span className="text-faint fs-8">{suggestion[player.id]?.reason}</span>}
                                </div>
                                <div className="x01-handicap-fields">
                                    {needsAge &&
                                        <span className="x01-handicap-age" title={player.guest ? t('Guests have no date of birth: their age helps the suggestion') : t('No date of birth yet: edit the player to add it')}>
                                            <InputNumber
                                                value={ages[player.id] ?? null}
                                                onValueChange={(e) => setAges(current => ({ ...current, [player.id]: e.value ?? undefined }))}
                                                min={3} max={110} placeholder={t('Age')} useGrouping={false}
                                                aria-label={t('Age of {{nickname}}', { nickname: player.nickname })}
                                                inputClassName="p-inputtext-sm"
                                            />
                                        </span>
                                    }
                                    <Dropdown value={rule.startingScore} options={SCORES} onChange={(e) => setRule(player.id, 'startingScore', e.value)} aria-label={t('Starting score of {{nickname}}', { nickname: player.nickname })} className="p-inputtext-sm x01-handicap-score" />
                                    <Dropdown value={rule.legInMode} options={IN_MODES} onChange={(e) => setRule(player.id, 'legInMode', e.value)} aria-label={t('Starting in of {{nickname}}', { nickname: player.nickname })} className="p-inputtext-sm" />
                                    <Dropdown value={rule.legOutMode} options={OUT_MODES} onChange={(e) => setRule(player.id, 'legOutMode', e.value)} aria-label={t('Checkout of {{nickname}}', { nickname: player.nickname })} className="p-inputtext-sm" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            }
        </div>
    );
};

export default X01HandicapConfig;
