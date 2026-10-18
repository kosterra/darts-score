import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { FaMedal } from 'react-icons/fa6';

import { TARGET_NAMES, hardestTargets, targetLabel } from '../../utils/atc.darts';
import { ordinal } from '../../utils/atc.scoreboard';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const MEDALS = ['gold', 'silver', 'bronze'];

// the darts at each target as small bars, the hardest ones highlighted
const TargetBars = ({ perTarget, hardest }) => {
    const most = Math.max(...perTarget);
    return (
        <div className="atc-target-bars" role="img" aria-label={`Darts per target: ${perTarget.map((darts, index) => `${TARGET_NAMES[index]} ${darts}`).join(', ')}`}>
            {perTarget.map((darts, index) => (
                <span
                    key={index}
                    className={hardest.some(target => target.index === index) ? 'is-hard' : ''}
                    style={{ height: `${Math.max(12, darts / most * 100)}%` }}
                    title={`${TARGET_NAMES[index]}: ${darts} ${darts === 1 ? 'dart' : 'darts'}`}
                />
            ))}
        </div>
    );
};

/**
 * The result of a round with the fewest darts: everybody's darts, how many hit,
 * where it took longest, and their place on the scoreboard.
 *
 * finished: { players, mode, results, saving, error }
 * placeOf(playerId): where the player's result is on the scoreboard, or null
 */
const ATCDartsResult = ({ finished, placeOf, onRetry, onPlayAgain, onDone }) => {
    const { players, mode, results, saving, error } = finished;
    const playerOf = (id) => players.find(player => player.id === id) ?? { nickname: 'Unknown player' };
    const solo = results.length === 1;

    return (
        <div className="atc-result-card">
            <ol className="atc-result-list">
                {results.map(result => {
                    const player = playerOf(result.playerId);
                    const hardest = hardestTargets(result.perTarget);
                    const place = placeOf(result.playerId);
                    return (
                        <li key={result.playerId} className="atc-result-player">
                            <div className="d-flex align-items-center gap-3">
                                {!solo && (result.rank <= 3
                                    ? <span className={`badge-medal badge-medal-sm badge-${MEDALS[result.rank - 1]} atc-medal`} role="img" aria-label={`${ordinal(result.rank)} in this round`}><FaMedal aria-hidden="true" /></span>
                                    : <span className="atc-rank">{result.rank}</span>)}
                                <Avatar
                                    image={resolvePlayerImg(player.profileImg)}
                                    label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                    shape="circle"
                                    className="avatar-sm flex-shrink-0"
                                />
                                <span className="atc-row-player">
                                    <span className="atc-row-name">{player.nickname}</span>
                                    <span className="atc-row-detail">
                                        {result.hitRate} % hit
                                        {hardest.length > 0 && ` · hardest ${hardest.map(target => `${targetLabel(target.index, mode)} (${target.darts})`).join(', ')}`}
                                    </span>
                                </span>
                                <span className="atc-row-time">{result.darts} darts</span>
                            </div>
                            <TargetBars perTarget={result.perTarget} hardest={hardest} />
                            {place && <div className="atc-result-place">{place}</div>}
                        </li>
                    );
                })}
            </ol>

            {error &&
                <div className="atc-result-error" role="alert">
                    <span>Not every result was saved.</span>
                    <Button type="button" label="Try again" icon="pi pi-refresh" size="small" loading={saving} onClick={onRetry} />
                </div>
            }
            {!error &&
                <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                    <Button type="button" label="Play again" icon="pi pi-replay" loading={saving} onClick={onPlayAgain} />
                    <Button type="button" label="Done" icon="pi pi-check" outlined disabled={saving} onClick={onDone} />
                </div>
            }
        </div>
    );
};

export default ATCDartsResult;
