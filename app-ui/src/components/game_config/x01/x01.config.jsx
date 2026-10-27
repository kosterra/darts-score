import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';

import X01ScoreConfig from '../config_components/x01.score.config';
import X01InOutConfig from '../config_components/x01.inout.config';
import SetsLegsConfig from '../config_components/sets.legs.config';
import PlayerPicker from '../config_components/player.picker';
import X01HandicapConfig from '../config_components/x01.handicap.config';
import X01DoublesConfig from '../config_components/x01.doubles.config';
import FlyingDartsConfig from '../config_components/flying.darts.config';
import GameSetupStart from '../config_components/game.setup.start';
import GameSetupMemory from '../config_components/game.setup.memory';
import QuickFormats from '../config_components/quick.formats';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';
import { MIN_PLAYERS } from '../../../utils/player.picker';
import { clearSetup, fitToPlayers, isFormat, loadSetup, saveSetup, X01_QUICK_FORMATS } from '../../../utils/setup.memory';
import ScoreConfigOptions from '../config_options/score.config.options';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';
import useClubGameRules from '../club_rules/use.club.game.rules';
import { FriendlyGame, HouseRules, NotPlayedHere } from '../club_rules/club.rules.setup';
import { missingPlayers, playersSummary, setsLegsSummary } from '../config_components/game.setup.summary';
import { t } from '../../../utils/i18n';
import useLinkedPlayers from '../../../utils/use.linked.players';
import useGameRules from '../../games/common/game.rules';

const SETTINGS = ['startingScore', 'legInMode', 'legOutMode', 'setMode', 'numberOfSets', 'legMode', 'numberOfLegs', 'legStarter', 'roundLimit', 'bull', 'flyingDarts'];
// the settings that are words; the others are numbers
const WORDS = ['setMode', 'legMode', 'legInMode', 'legOutMode', 'flyingDarts', 'legStarter', 'bull'];

// the most points the players' own starting scores differ by
const spreadOf = (handicap) => {
    const scores = Object.values(handicap ?? {}).map(rules => Number(rules.startingScore));
    return scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
};

const X01Config = () => {
    // the rules of the game, opened from the title of the setup
    const [rulesButton, rules] = useGameRules('x01');
    // the club's own rules: its defaults, the choices it offers, its locks and formats
    const club = useClubGameRules('x01');
    // the page starts set up like the last game, within the club's rules
    const [remembered, setRemembered] = useState(() => loadSetup('x01'));
    // players chosen by a link, e.g. from the player comparison
    const linkedPlayers = useLinkedPlayers();
    const [game, setGame] = useState(() => ({ ...X01Models.X01GameModel, ...club.start(remembered?.settings) }));
    // a friendly game: left out of the club's leaderboards, records and Hall of Shame
    const [friendlyChosen, setFriendlyChosen] = useState(Boolean(remembered?.friendly) && club.friendlyChoice);
    const [players, setPlayers] = useState([]);
    // the own rules of every player, null without a handicap
    const [handicap, setHandicap] = useState(null);
    // doubles with four players: the teams follow the throwing order (see utils/doubles.js)
    const [doubles, setDoubles] = useState(Boolean(remembered?.doubles));
    const [starting, setStarting] = useState(false);
    // the handicap of the last game comes back with its players
    const pendingHandicap = useRef(remembered?.handicap ?? null);

    const toast = useRef(null);
    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        const next = WORDS.includes(name) ? value : Number(value);
        setGame(current => club.withLocks({ ...current, [name]: next }));
    };

    const onPlayersChange = (chosen) => {
        setPlayers(chosen);
        // doubles are two sides: "Best of" stays possible
        setGame(current => fitToPlayers(current, doubles && chosen.length === 4 ? 2 : chosen.length));
        const restoring = pendingHandicap.current;
        pendingHandicap.current = null;
        // a player who plays without a handicap: everyone from the game's own score
        if (chosen.length < MIN_PLAYERS || chosen.some(player => player.preferences?.handicap === 'decline')) setHandicap(null);
        else if (restoring && club.handicap.mode !== 'off' && chosen.every(player => restoring[player.id])) setHandicap(restoring);
        else if (handicap) setHandicap(Object.fromEntries(chosen.filter(player => handicap[player.id]).map(player => [player.id, handicap[player.id]])));
    };

    const formats = club.quickFormats(X01_QUICK_FORMATS);
    // who play against each other: the two teams in doubles, otherwise the players
    const sides = doubles && players.length === 4 ? 2 : players.length;
    const changeDoubles = (next) => {
        setDoubles(next);
        // back to everyone for themselves: four sides again
        if (!next && players.length === 4) setGame(current => club.withLocks(fitToPlayers(current, 4)));
    };
    const applyFormat = (settings, format) => {
        setGame(current => club.withLocks({ ...current, ...fitToPlayers(settings, sides) }));
        if (format?.club && club.friendlyChoice) setFriendlyChosen(format.friendly);
    };
    // the club format the game is set up as, and whether it is friendly
    const clubFormat = club.formats.find(format => isFormat(game, format, sides)) ?? null;
    const friendly = club.friendlyChoice ? friendlyChosen : Boolean(clubFormat?.friendly);
    const isDoubles = doubles && players.length === 4;
    // doubles are played from the game's own rules: a handicap would split a team's score
    const handicapOff = club.handicap.mode === 'off' || isDoubles;
    const ownRules = isDoubles ? null : handicap;
    const tooFarApart = ownRules && club.handicap.maxDifference > 0 && spreadOf(ownRules) > club.handicap.maxDifference;

    const startFresh = () => {
        clearSetup('x01');
        setRemembered(null);
        setGame({ ...X01Models.X01GameModel, ...club.start() });
        setPlayers([]);
        setHandicap(null);
        setDoubles(false);
        setFriendlyChosen(false);
    };

    const rulesOf = (playerId) => ownRules?.[playerId] ?? { startingScore: Number(game.startingScore), legInMode: game.legInMode, legOutMode: game.legOutMode };

    const missing = missingPlayers(players)
        || (tooFarApart ? t('The starting scores may differ by {{points}} points at most.', { points: club.handicap.maxDifference }) : null);
    const summary = [
        ownRules ? 'Handicap' : `${game.startingScore} · ${game.legInMode} / ${game.legOutMode}`,
        isDoubles ? t('Doubles') : null,
        setsLegsSummary(game),
        friendly ? t('Friendly') : null,
        playersSummary(players),
    ].filter(Boolean).join(' · ');

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('x01', { settings: Object.fromEntries(SETTINGS.map(name => [name, game[name]])), players, handicap: ownRules, friendly, doubles: isDoubles });
        // in doubles the teams follow the throwing order: a1, b1, a2, b2
        const playerIds = players.map(player => player.id);
        const playerModels = Object.fromEntries(playerIds.map(playerId => {
            const rules = rulesOf(playerId);
            return [playerId, {
                ...X01Models.X01PlayerModel,
                ...(ownRules && rules),
                score: Number(rules.startingScore),
            }];
        }));
        try {
            const newGame = await X01Service.createX01Game({
                ...club.withLocks(game),
                ...(friendly ? { friendly: true } : {}),
                ...(isDoubles ? { doubles: true } : {}),
                ...(clubFormat ? { format: clubFormat.id } : {}),
                isSoloGame: false,
                numberOfPlayers: playerIds.length,
                players: playerIds,
                currentPlayerTurn: playerIds[0],
                startingPlayerSet: playerIds[0],
                startingPlayerLeg: playerIds[0],
                playerModels,
            });
            navigate('/x01/' + newGame.id);
        } catch (error) {
            toast.current.show({ severity: 'error', summary: t('Start Game'), detail: t('Failed to create the game. ') + error.message, life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header={t('X01')} className="page-narrow" icons={rulesButton}>
                {rules}
                {!club.enabled ? <NotPlayedHere title={t('X01')} /> :
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={onPlayersChange} initialIds={linkedPlayers ?? remembered?.playerIds} key={linkedPlayers ? `linked-${linkedPlayers.join()}` : remembered ? 'remembered' : 'fresh'} />

                    <X01DoublesConfig players={players} doubles={doubles} onChange={changeDoubles} onOrder={onPlayersChange} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {formats.length > 0 && <QuickFormats game="x01" formats={formats} settings={game} playerCount={sides} onApply={applyFormat} />}
                    <X01ScoreConfig
                        scoreOption={game.startingScore}
                        onScoreChange={handleConfigChange}
                        options={club.options('startingScore', ScoreConfigOptions.gameScoreOptions.values)}
                        locked={club.locked('startingScore')}
                    />
                    <X01InOutConfig
                        legInOption={game.legInMode}
                        legOutOption={game.legOutMode}
                        onInOutChange={handleConfigChange}
                        inOptions={club.options('legInMode', SetsLegsConfigOptions.legInOptions.values)}
                        outOptions={club.options('legOutMode', SetsLegsConfigOptions.legOutOptions.values)}
                        inLocked={club.locked('legInMode')}
                        outLocked={club.locked('legOutMode')}
                    />
                    <SetsLegsConfig
                        setModeOption={game.setMode}
                        legModeOption={game.legMode}
                        numberOfSetsOption={game.numberOfSets}
                        numberOfLegsOption={game.numberOfLegs}
                        onSetsLegsChange={handleConfigChange}
                        modeOptions={club.options('setMode', SetsLegsConfigOptions.setLegModeOptions.values)}
                        locked={Object.fromEntries(['setMode', 'numberOfSets', 'legMode', 'numberOfLegs'].map(key => [key, club.locked(key)]))}
                    />
                    <HouseRules game="x01" club={club} settings={game} onChange={handleConfigChange} />
                    {!handicapOff &&
                        <X01HandicapConfig
                            game={game}
                            players={players}
                            rules={handicap}
                            onChange={setHandicap}
                            suggest={club.handicap.mode === 'suggested'}
                            maxDifference={club.handicap.maxDifference}
                            declined={players.filter(player => player.preferences?.handicap === 'decline').map(player => player.nickname)}
                        />}
                    <FlyingDartsConfig value={game.flyingDarts} onChange={(value) => handleConfigChange('flyingDarts', value)} />
                    <FriendlyGame club={club} value={friendly} onChange={setFriendlyChosen} />

                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>}
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default X01Config;
