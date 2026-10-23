import { Avatar } from 'primereact/avatar';

import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { heldBy, useClubShame } from '../../badges/hall.of.shame.data';
import ShameMedal from '../../badges/shame.medal';
import useGameRules from './game.rules';
import PlayerFlight from '../../flights/player.flight';
import { t } from '../../../utils/i18n';

/**
 * The top of a running game in the look of the X01 page: what is played, and
 * every player with their portrait (a halo for the one at the oche), a line
 * about their play, the tags, and the score with what goes under it. With two
 * players the second is mirrored, so the scores face each other.
 *
 * rows: [{ player, isTurn, line, tags, score, scoreClass, scoreKey, below }];
 * a new scoreKey plays the score's animation again (e.g. taking the lead).
 * rulesId: the game's rules (see about/rules), opened from the header.
 */
const LiveHero = ({ title, subtitle, rows, rulesId }) => {
    // the shame badges each player holds in the club, shown small next to the tags
    const shame = useClubShame();
    const [rulesButton, rules] = useGameRules(rulesId);

    return (
        <header className="hero-header result-hero x01-live-hero">
            <div className="result-hero-top">
                <div className="d-flex flex-column">
                    <span className="text-default fw-semibold">{title}</span>
                    {subtitle && <span className="text-faint fs-8">{subtitle}</span>}
                </div>
                {rulesButton}
            </div>
            {rules}

            <div className={`x01-hero-players count-${rows.length}`}>
                {rows.map(({ player, isTurn, line, tags, score, scoreClass = '', scoreKey, below }, index) => (
                    <div key={player.id} className={`x01-hero-player ${isTurn ? 'is-turn' : ''} ${rows.length === 2 && index === 1 ? 'is-mirrored' : ''}`} aria-current={isTurn ? 'true' : undefined}>
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
                                {!(rows.length === 2 && index === 1) && <PlayerFlight player={player} seat={index} />}
                                {player.nickname}
                                {rows.length === 2 && index === 1 && <PlayerFlight player={player} seat={index} />}
                            </span>
                            {line && <span className="x01-live-leg">{line}</span>}
                            <span className="x01-live-tags">
                                {isTurn && <span className="x01-live-turn">{t('Throwing')}</span>}
                                {tags}
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
                            <span key={scoreKey} className={`result-hero-score ${scoreClass}`}>{score}</span>
                            {below}
                        </div>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default LiveHero;
