import { useContext, useEffect, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaCircle, FaRegCircle } from 'react-icons/fa';
import { GiDart } from 'react-icons/gi';

import X01Context from '../../../utils/x01.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { describeRules, hasHandicap, outModeOf, rulesOf } from '../../../utils/x01.rules';
import { legSummaryOf } from '../../../utils/x01.live';
import { checkoutRoutes, formatRoute, scoringTip, setupSuggestions } from '../../../utils/checkout.routes';
import { heldBy, useClubShame } from '../../badges/hall.of.shame.data';
import ShameMedal from '../../badges/shame.medal';
import PlayerFlight from '../../flights/player.flight';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// legs or sets needed to win: the majority of a "Best of", all of a "First to"
const needed = (mode, count) => mode === 'Best of' ? Math.round(count / 2) : count;

// legs or sets won as circles out of those needed, or as a number when there are too many
const WonCount = ({ label, won, mode, count }) => {
    const needed = mode === 'Best of' ? Math.round(count / 2) : count;
    const circles = mode === 'Best of' ? count <= 5 : count <= 4;
    return (
        <span className="x01-won">
            <span className="x01-won-label">{label}</span>
            {circles
                ? <span className="x01-won-circles" aria-label={`${won} of ${needed}`}>
                    {Array.from({ length: needed }, (_, index) => index < won ? <FaCircle key={index} className="text-gold" /> : <FaRegCircle key={index} className="text-gold" />)}
                </span>
                : <span className="x01-won-number">{won}</span>}
        </span>
    );
};

/**
 * The top of a running X01 game in the look of the statistics page: what is
 * played, every player with the score left (live while the darts are entered),
 * the way out with the legs and sets under it; with two players the second is
 * mirrored, so the scores face each other. The player at the oche has a halo;
 * the key figures are in a panel below, so the board stays in view.
 */
const X01LiveHeader = () => {
    const { game, players, checkoutProfiles = {}, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);
    // the shame badges each player holds in the club, shown small next to the tags
    const shame = useClubShame();
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const dartsEntered = game.currentThrow.filter(dart => dart.trim() !== '').length;
    const handicap = hasHandicap(game);

    // a visit of 100 or more: a short "TON!" next to the score of the player who threw it
    const [ton, setTon] = useState(null);
    const visits = game.currentLegThrows.length;
    const seenVisits = useRef(visits);
    useEffect(() => {
        if (visits > seenVisits.current) {
            const last = game.currentLegThrows.at(-1);
            const bust = legSummaryOf(game, last.playerId).lastVisit?.bust;
            const score = Number(last.roundScore);
            if (!bust && score >= 100 && score < 180) setTon({ id: last.playerId, text: score >= 140 ? 'TON-40!' : 'TON!', key: Date.now() });
        }
        seenVisits.current = visits;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visits]);

    return (
        <header className="hero-header result-hero x01-live-hero">
            <div className="result-hero-top">
                <div className="d-flex flex-column">
                    <span className="text-default fw-semibold">
                        {handicap ? 'Handicap' : game.startingScore} · {game.setMode} {plural(game.numberOfSets, 'set')} · {game.legMode} {plural(game.numberOfLegs, 'leg')}
                    </span>
                    <span className="text-faint fs-8">
                        {handicap ? 'Own starting score and in/out per player' : `${game.legInMode} / ${game.legOutMode}`}
                        {` · ${game.numberOfSets > 1 ? `Set ${game.currentSet} · ` : ''}Leg ${game.currentSetLeg}`}
                    </span>
                </div>
            </div>

            <div className={`x01-hero-players count-${ordered.length}`}>
                {ordered.map((player, index) => {
                    const model = game.playerModels[player.id];
                    const isTurn = game.currentPlayerTurn === player.id;
                    const score = isTurn ? model.score - getCurrentThrowScore() : model.score;
                    const busted = isTurn && checkIfScoreIsBusted(score);
                    // with every dart of the visit in, the way out of the next visit counts
                    const dartsLeft = isTurn ? 3 - dartsEntered : 3;
                    // the player's own doubles and main treble, set or learned from their games
                    const profile = checkoutProfiles[player.id];
                    const throwing = { dartsLeft: dartsLeft || 3, outMode: outModeOf(game, player.id), doubles: profile?.doubleOrder ?? [], mainTreble: profile?.mainTreble };
                    const routes = busted ? [] : checkoutRoutes(score, throwing);
                    // no finish: what to set up instead, as the checkout table suggests, or what to score
                    const setup = busted || routes.length ? null : setupSuggestions(score, throwing)[0];
                    const tip = busted || routes.length || setup ? null : scoringTip(score, throwing);
                    const plan = setup ?? (tip?.darts ? tip : null);
                    const leg = legSummaryOf(game, player.id);
                    // on a finish that wins the match (or the set)
                    const onTheBrinkOfSet = routes[0] && model.currentSetLegsWon === needed(game.legMode, game.numberOfLegs) - 1;
                    const matchDart = onTheBrinkOfSet && (game.numberOfSets <= 1 || model.setsWon === needed(game.setMode, game.numberOfSets) - 1);
                    const setDart = onTheBrinkOfSet && !matchDart;
                    return (
                        <div key={player.id} className={`x01-hero-player ${isTurn ? 'is-turn' : ''} ${ordered.length === 2 && index === 1 ? 'is-mirrored' : ''}`} aria-current={isTurn ? 'true' : undefined}>
                            <span className="result-hero-portrait x01-hero-portrait">
                                {isTurn && <span className="x01-turn-halo" style={{ '--player-colour': PLAYER_COLORS[index] }} aria-hidden="true" />}
                                <Avatar
                                    label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
                                    image={resolvePlayerImg(player.profileImg)}
                                    shape="circle"
                                    className="bg-surface-high result-hero-avatar x01-hero-avatar"
                                    style={{ '--player-colour': PLAYER_COLORS[index] }}
                                />
                            </span>
                            <div className="x01-hero-info">
                                <span className="x01-hero-name text-truncate" title={player.nickname}>
                                    {/* mirrored, the flight follows the name */}
                                    {!(ordered.length === 2 && index === 1) && <PlayerFlight player={player} seat={game.players.indexOf(player.id)} />}
                                    {player.nickname}
                                    {ordered.length === 2 && index === 1 && <PlayerFlight player={player} seat={game.players.indexOf(player.id)} />}
                                </span>
                                <span className="x01-live-leg">
                                    Last visit <strong>{leg.lastVisit ? (leg.lastVisit.bust ? 'Bust' : leg.lastVisit.score) : '–'}</strong> · <strong>{leg.darts}</strong> darts
                                </span>
                                <span className="x01-live-tags">
                                    {isTurn && <span className="x01-live-turn">Throwing</span>}
                                    {game.startingPlayerLeg === player.id && <span className="x01-live-starter" title="Threw first in this leg"><GiDart aria-hidden="true" /> Started</span>}
                                    {matchDart && <span className="x01-dart-for is-match">Match dart</span>}
                                    {setDart && <span className="x01-dart-for">Set dart</span>}
                                    {handicap && <span className="x01-handicap-rules">{describeRules(rulesOf(game, player.id))}</span>}
                                    {heldBy(shame, player.id).length > 0 &&
                                        // the shame badges keep together: they go to the next line as one
                                        <span className="x01-shames">
                                            {heldBy(shame, player.id).map(badge => (
                                                <span key={badge.id} className="x01-shame">
                                                    <ShameMedal badge={badge} size="xs" title={`Holds the ${badge.title} in the club. Wash it off: ${badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1)}`} />
                                                </span>
                                            ))}
                                        </span>}
                                </span>
                            </div>
                            <div className="x01-hero-score">
                                {ton?.id === player.id && <span key={ton.key} className="x01-ton-pop" aria-hidden="true">{ton.text}</span>}
                                <span className={`result-hero-score ${busted ? 'is-bust' : ''}`}>{busted ? 'BUST' : score}</span>
                                {/* always a line, so the legs of the players stay in line */}
                                <span
                                    className={`x01-live-route ${routes[0] ? '' : 'is-setup'} ${matchDart ? 'is-match-dart' : ''}`}
                                    title={plan ? `No finish: this leaves ${plan.leaves}` : tip?.advice ?? undefined}
                                >
                                    {routes[0]
                                        ? formatRoute(routes[0])
                                        : plan ? <>{formatRoute(plan.darts)}<span className="x01-route-leaves"><i className="pi pi-arrow-right" aria-hidden="true" />leaves {plan.leaves}</span></>
                                        : tip ? `Stay on ${profile?.mainTreble === 'T19' || profile?.mainTreble === 'T18' ? profile.mainTreble : 'T20'}`
                                        : '\u00a0'}
                                </span>
                                <span className="x01-live-won">
                                    <WonCount label="Legs" won={model.currentSetLegsWon} mode={game.legMode} count={game.numberOfLegs} />
                                    {game.numberOfSets > 1 && <WonCount label="Sets" won={model.setsWon} mode={game.setMode} count={game.numberOfSets} />}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </header>
    );
};

export default X01LiveHeader;
