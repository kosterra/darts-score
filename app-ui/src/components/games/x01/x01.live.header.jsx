import { useContext, useEffect, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaCircle, FaRegCircle } from 'react-icons/fa';
import { GiDart } from 'react-icons/gi';

import X01Context from '../../../utils/x01.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { describeRules, hasHandicap, outModeOf, rulesOf } from '../../../utils/x01.rules';
import { legSummaryOf, nextOfTeam } from '../../../utils/x01.live';
import { teamsOf } from '../../../rules/x01';
import { checkoutRoutes, formatRoute, scoringTip, setupSuggestions } from '../../../utils/checkout.routes';
import { heldBy, useClubShame } from '../../badges/hall.of.shame.data';
import ShameMedal from '../../badges/shame.medal';
import PlayerFlight from '../../flights/player.flight';
import useGameRules from '../common/game.rules';
import CallerButton from '../common/caller.button';
import GameScreenButton from '../../screen/game.screen.button';
import QuickHeroBrand from '../../quick/quick.hero.brand';
import useWaysOut from './use.ways.out';
import { houseRuleLines } from '../../../utils/club.rules.labels';
import { t } from '../../../utils/i18n';

// "3 games" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });
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
                ? <span className="x01-won-circles" aria-label={t('{{won}} of {{needed}}', { won: won, needed: needed })}>
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
    const { game, players, checkoutProfiles = {}, getCurrentThrowScore, checkIfScoreIsBusted, training, quick } = useContext(X01Context);
    // the shame badges each player holds in the club, shown small next to the tags
    const shame = useClubShame();
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const playerOf = (id) => players.find(player => player.id === id);
    // who play against each other: each player, or in doubles the two teams, shown
    // by the partner who throws next (the other one small beside the name)
    const teams = teamsOf(game);
    const sides = teams
        ? teams.map(team => {
            const next = nextOfTeam(game, team);
            return { player: playerOf(next), partner: playerOf(team.find(id => id !== next)), team };
        }).filter(side => side.player)
        : ordered.map(player => ({ player, partner: null, team: [player.id] }));
    const dartsEntered = game.currentThrow.filter(dart => dart.trim() !== '').length;
    const handicap = hasHandicap(game);
    const [rulesButton, rules] = useGameRules('x01', houseRuleLines('x01', game));
    const waysOut = useWaysOut();

    // a visit of 100 or more: a short "TON!" next to the score of the player who threw it
    const [ton, setTon] = useState(null);
    const visits = game.currentLegThrows.length;
    const seenVisits = useRef(visits);
    useEffect(() => {
        if (visits > seenVisits.current) {
            const last = game.currentLegThrows.at(-1);
            const bust = legSummaryOf(game, last.playerId).lastVisit?.bust;
            const score = Number(last.roundScore);
            if (!bust && score >= 100 && score < 180) setTon({ id: last.playerId, text: score >= 140 ? t('TON-40!') : t('TON!'), key: Date.now() });
        }
        seenVisits.current = visits;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visits]);

    return (
        <header className="hero-header result-hero x01-live-hero">
            <div className="result-hero-top">
                <div className="d-flex align-items-center gap-3 min-w-0">
                <QuickHeroBrand />
                <div className="d-flex flex-column">
                    <span className="text-default fw-semibold">
                        {handicap ? t('Handicap') : game.startingScore}{teams && <> · {t('Doubles')}</>} · {game.setMode} {plural(game.numberOfSets, 'set')} · {game.legMode} {plural(game.numberOfLegs, 'leg')}
                    </span>
                    <span className="text-faint fs-8">
                        {handicap ? t('Own starting score and in/out per player') : `${game.legInMode} / ${game.legOutMode}`}
                        {t(' · {{value}}Leg {{currentSetLeg}}', { value: game.numberOfSets > 1 ? `Set ${game.currentSet} · ` : '', currentSetLeg: game.currentSetLeg })}
                    </span>
                </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <CallerButton />
                    {/* a club game, or the evening of a quick game, also on a TV or second tablet */}
                    <GameScreenButton kind="x01" game={game} quick={quick} training={training} />
                    {rulesButton}
                </div>
            </div>
            {rules}

            <div className={`x01-hero-players count-${sides.length}`}>
                {sides.map(({ player, partner, team }, index) => {
                    const model = game.playerModels[player.id];
                    const isTurn = game.currentPlayerTurn === player.id;
                    const score = isTurn ? model.score - getCurrentThrowScore() : model.score;
                    const busted = isTurn && checkIfScoreIsBusted(score);
                    // with every dart of the visit in, the way out of the next visit counts
                    const dartsLeft = isTurn ? 3 - dartsEntered : 3;
                    // the player's own doubles and main treble, set or learned from their games
                    const profile = checkoutProfiles[player.id];
                    const throwing = { dartsLeft: dartsLeft || 3, outMode: outModeOf(game, player.id), doubles: profile?.doubleOrder ?? [], mainTreble: profile?.mainTreble };
                    // the ways out as the club and the player want them: for everyone, the one at the oche only, or none
                    const shown = waysOut === 'all' || (waysOut === 'turn' && isTurn);
                    const routes = busted || !shown ? [] : checkoutRoutes(score, throwing);
                    // no finish: what to set up instead, as the checkout table suggests, or what to score
                    const setup = busted || !shown || routes.length ? null : setupSuggestions(score, throwing)[0];
                    const tip = busted || !shown || routes.length || setup ? null : scoringTip(score, throwing);
                    const plan = setup ?? (tip?.darts ? tip : null);
                    // in doubles the team's leg: its last visit and darts
                    const leg = legSummaryOf(game, team);
                    // on a finish that wins the match (or the set)
                    const onTheBrinkOfSet = routes[0] && model.currentSetLegsWon === needed(game.legMode, game.numberOfLegs) - 1;
                    const matchDart = onTheBrinkOfSet && (game.numberOfSets <= 1 || model.setsWon === needed(game.setMode, game.numberOfSets) - 1);
                    const setDart = onTheBrinkOfSet && !matchDart;
                    return (
                        <div key={team.join('-')} className={`x01-hero-player ${isTurn ? 'is-turn' : ''} ${sides.length === 2 && index === 1 ? 'is-mirrored' : ''}`} aria-current={isTurn ? 'true' : undefined}>
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
                                    {!(sides.length === 2 && index === 1) && <PlayerFlight player={player} seat={game.players.indexOf(player.id)} />}
                                    {player.nickname}
                                    {sides.length === 2 && index === 1 && <PlayerFlight player={player} seat={game.players.indexOf(player.id)} />}
                                </span>
                                {partner && <span className="x01-hero-partner text-truncate" title={partner.nickname}>{t('with {{name}}', { name: partner.nickname })}</span>}
                                <span className="x01-live-leg">
                                    {t('Last visit')}{' '}<strong>{leg.lastVisit ? (leg.lastVisit.bust ? t('Bust') : leg.lastVisit.score) : '–'}</strong> · <strong>{leg.darts}</strong>{' '}{t('darts')}
                                </span>
                                <span className="x01-live-tags">
                                    {isTurn && <span className="x01-live-turn">{t('Throwing')}</span>}
                                    {game.startingPlayerLeg === player.id && <span className="x01-live-starter" title={t('Threw first in this leg')}><GiDart aria-hidden="true" />{' '}{t('Started')}</span>}
                                    {matchDart && <span className="x01-dart-for is-match">{t('Match dart')}</span>}
                                    {setDart && <span className="x01-dart-for">{t('Set dart')}</span>}
                                    {handicap && <span className="x01-handicap-rules">{describeRules(rulesOf(game, player.id))}</span>}
                                    {heldBy(shame, player.id).length > 0 &&
                                        // the shame badges keep together: they go to the next line as one
                                        <span className="x01-shames">
                                            {heldBy(shame, player.id).map(badge => (
                                                <span key={badge.id} className="x01-shame">
                                                    <ShameMedal badge={badge} size="xs" title={t('Holds the {{title}} in the club. Wash it off: {{value}}', { title: badge.title, value: badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1) })} />
                                                </span>
                                            ))}
                                        </span>}
                                </span>
                            </div>
                            <div className="x01-hero-score">
                                {team.includes(ton?.id) && <span key={ton.key} className="x01-ton-pop" aria-hidden="true">{ton.text}</span>}
                                <span className={`result-hero-score ${busted ? 'is-bust' : ''}`}>{busted ? t('BUST') : score}</span>
                                {/* always a line, so the legs of the players stay in line */}
                                <span
                                    className={`x01-live-route ${routes[0] ? '' : 'is-setup'} ${matchDart ? 'is-match-dart' : ''}`}
                                    title={plan ? t('No finish: this leaves {{leaves}}', { leaves: plan.leaves }) : tip?.advice ?? undefined}
                                >
                                    {routes[0]
                                        ? formatRoute(routes[0])
                                        : plan ? <>{formatRoute(plan.darts)}<span className="x01-route-leaves"><i className="pi pi-arrow-right" aria-hidden="true" />{t('leaves')}{' '}{plan.leaves}</span></>
                                        : tip ? t('Stay on {{value}}', { value: profile?.mainTreble === 'T19' || profile?.mainTreble === 'T18' ? profile.mainTreble : 'T20' })
                                        : '\u00a0'}
                                </span>
                                <span className="x01-live-won">
                                    <WonCount label={t('Legs')} won={model.currentSetLegsWon} mode={game.legMode} count={game.numberOfLegs} />
                                    {game.numberOfSets > 1 && <WonCount label={t('Sets')} won={model.setsWon} mode={game.setMode} count={game.numberOfSets} />}
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
