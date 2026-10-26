import CountryFlag from '../elements/country.flag';
import ClubLogo from '../elements/club.logo';
import { legSummaryOf } from '../../utils/x01.live';
import { hasHandicap, outModeOf } from '../../utils/x01.rules';
import { checkoutRoutes, formatRoute } from '../../utils/checkout.routes';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';
import { t } from '../../utils/i18n';

// "3 legs" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });
const initials = (name = '') => name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

// legs or sets won, as dots out of those needed (a number when there are many)
const Won = ({ label, won, mode, count }) => {
    const needed = mode === 'Best of' ? Math.round(count / 2) : count;
    return (
        <span className="big-won">
            <span className="big-won-label">{label}</span>
            {needed <= 6
                ? <span className="big-won-dots" aria-label={t('{{won}} of {{needed}}', { won, needed })}>
                    {Array.from({ length: needed }, (_, index) => <span key={index} className={`big-won-dot ${index < won ? 'is-won' : ''}`} />)}
                </span>
                : <span className="big-won-number">{won}</span>}
        </span>
    );
};

/**
 * A running X01 game on a big screen: what is played, and every player large
 * with the score left, the legs and sets, the average and last visit of the
 * leg; the player at the oche lit, with the way out when they are on a finish.
 */
const BigScreenX01 = ({ game, players, club }) => {
    const byId = new Map(players.map(player => [player.id, player]));
    const ordered = game.players.map(id => byId.get(id) ?? { id, nickname: '?' });
    const handicap = hasHandicap(game);
    const winner = game.hasWinner ? ordered.find(player => game.playerModels[player.id]?.hasWonGame) : null;
    return (
        <div className={`big-screen big-screen-x01 is-${ordered.length}-players`}>
            <header className="big-screen-top">
                <span className="big-screen-club">
                    {club && <ClubLogo club={club} size="sm" />}
                    <span>{club?.name ?? 'Legmate'}</span>
                </span>
                <span className="big-screen-format">
                    {handicap ? t('Handicap') : game.startingScore} · {game.setMode} {plural(game.numberOfSets, 'set')} · {game.legMode} {plural(game.numberOfLegs, 'leg')}
                    {game.currentSetLeg != null &&
                        <span className="big-screen-leg">
                            {game.numberOfSets > 1 && <>{t('Set')} {game.currentSet} · </>}{t('Leg')} {game.currentSetLeg}
                        </span>}
                </span>
            </header>

            {winner &&
                <div className="big-screen-winner" role="status">
                    <span className="big-screen-winner-label">{t('Game shot, and the match!')}</span>
                    <span className="big-screen-winner-name">{winner.nickname}</span>
                </div>}

            <div className="big-screen-players">
                {ordered.map((player, index) => {
                    const model = game.playerModels[player.id] ?? {};
                    const isTurn = !game.hasWinner && game.currentPlayerTurn === player.id;
                    const leg = legSummaryOf(game, player.id);
                    const routes = isTurn && model.score > 0 ? checkoutRoutes(model.score, { outMode: outModeOf(game, player.id) }) : [];
                    return (
                        <section key={player.id} className={`big-player ${isTurn ? 'is-turn' : ''}`} style={{ '--player-colour': PLAYER_COLORS[index] }} aria-current={isTurn || undefined}>
                            <div className="big-player-head">
                                <span className="big-player-avatar" aria-hidden="true">{initials(player.nickname)}</span>
                                <span className="big-player-name">{player.nickname}</span>
                                {player.country && <CountryFlag code={player.country} className="big-player-flag" />}
                            </div>
                            <span className="big-player-score">{model.score ?? '–'}</span>
                            <div className="big-player-won">
                                <Won label={t('Legs')} won={model.currentSetLegsWon ?? 0} mode={game.legMode} count={game.numberOfLegs} />
                                {game.numberOfSets > 1 && <Won label={t('Sets')} won={model.setsWon ?? 0} mode={game.setMode} count={game.numberOfSets} />}
                            </div>
                            <dl className="big-player-figures">
                                <div><dt>{t('Average')}</dt><dd>{leg.average != null ? leg.average.toFixed(1) : '–'}</dd></div>
                                <div><dt>{t('Last visit')}</dt><dd>{leg.lastVisit ? (leg.lastVisit.bust ? t('Bust') : leg.lastVisit.score) : '–'}</dd></div>
                                <div><dt>{t('Darts')}</dt><dd>{leg.darts}</dd></div>
                            </dl>
                            {isTurn && <span className="big-player-turn">{routes.length ? formatRoute(routes[0]) : t('Throwing')}</span>}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default BigScreenX01;
