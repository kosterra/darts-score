import { useContext } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaCircle, FaRegCircle } from 'react-icons/fa';
import { GiDart } from 'react-icons/gi';

import X01Context from '../../../utils/x01.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { describeRules, hasHandicap, outModeOf, rulesOf } from '../../../utils/x01.rules';
import { legSummaryOf } from '../../../utils/x01.live';
import { checkoutRoutes, formatRoute } from '../../../utils/checkout.routes';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

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
 * the way out, legs and sets. The player at the oche has a halo in their colour;
 * the key figures are in a panel below, so the board stays in view.
 */
const X01LiveHeader = () => {
    const { game, players, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const dartsEntered = game.currentThrow.filter(dart => dart.trim() !== '').length;
    const handicap = hasHandicap(game);

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

            <div className={`result-hero-players count-${ordered.length}`}>
                {ordered.map((player, index) => {
                    const model = game.playerModels[player.id];
                    const isTurn = game.currentPlayerTurn === player.id;
                    const score = isTurn ? model.score - getCurrentThrowScore() : model.score;
                    const busted = isTurn && checkIfScoreIsBusted(score);
                    const routes = busted ? [] : checkoutRoutes(score, { dartsLeft: isTurn ? 3 - dartsEntered : 3, outMode: outModeOf(game, player.id) });
                    const leg = legSummaryOf(game, player.id);
                    return (
                        <div key={player.id} className={`result-hero-player ${isTurn ? 'is-turn' : ''}`} aria-current={isTurn ? 'true' : undefined}>
                            <span className="result-hero-portrait">
                                {isTurn && <span className="x01-turn-halo" style={{ '--player-colour': PLAYER_COLORS[index] }} aria-hidden="true" />}
                                <Avatar
                                    label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
                                    image={resolvePlayerImg(player.profileImg)}
                                    shape="circle"
                                    className="avatar-lg bg-surface-high result-hero-avatar"
                                    style={{ '--player-colour': PLAYER_COLORS[index] }}
                                />
                            </span>
                            <span className="result-hero-name fw-semibold text-default text-center text-truncate" title={player.nickname}>{player.nickname}</span>
                            <span className="x01-live-tags">
                                {isTurn && <span className="x01-live-turn">Throwing</span>}
                                {game.startingPlayerLeg === player.id && <span className="x01-live-starter" title="Threw first in this leg"><GiDart aria-hidden="true" /> Started</span>}
                                {handicap && <span className="x01-handicap-rules">{describeRules(rulesOf(game, player.id))}</span>}
                            </span>
                            <span className={`result-hero-score ${busted ? 'is-bust' : ''}`}>{busted ? 'BUST' : score}</span>
                            <span className={`x01-live-route ${routes[0] ? '' : 'is-empty'}`} title={routes.length > 1 ? `${routes.length} ways to finish` : undefined}>
                                {routes[0] ? <>{formatRoute(routes[0])}{routes.length > 1 && <span className="x01-live-route-more">+{routes.length - 1}</span>}</> : ' '}
                            </span>
                            <span className="x01-live-leg">
                                Last <strong>{leg.lastVisit ? (leg.lastVisit.bust ? 'Bust' : leg.lastVisit.score) : '–'}</strong> · <strong>{leg.darts}</strong> darts
                            </span>
                            <span className="x01-live-won">
                                <WonCount label="Legs" won={model.currentSetLegsWon} mode={game.legMode} count={game.numberOfLegs} />
                                {game.numberOfSets > 1 && <WonCount label="Sets" won={model.setsWon} mode={game.setMode} count={game.numberOfSets} />}
                            </span>
                        </div>
                    );
                })}
            </div>
        </header>
    );
};

export default X01LiveHeader;
