import { useContext, useMemo, useState } from 'react';
import { Button } from 'primereact/button';

import X01Context from '../../../utils/x01.context';
import X01FormCard from './x01.form.card';
import { startingScoreOf } from '../../../utils/x01.rules';

const RANGES = ['180', '160-179', '140-159', '120-139', '100-119', '80-99', '60-79', '40-59', '20-39', '1-19', 'ZERO'];
const TON_PLUS = ['180', '160-179', '140-159', '120-139', '100-119'];

const getNested = (obj, path, fallback = 0) =>
    path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? fallback;

const oneDecimal = (value) => value ? value.toFixed(1) : '–';
const highestCheckout = (scores) => Math.max(0, ...Object.keys(scores ?? {}).map(Number).filter(Number.isFinite)) || '–';

/**
 * A figure for the leg, the set and the game in a table with headings; the set
 * column only when more than one set is played.
 */
const FigureTable = ({ rows, withSet }) => (
    <table className="x01-stats-table">
        <thead>
            <tr>
                <th scope="col"><span className="visually-hidden">Figure</span></th>
                <th scope="col">Leg</th>
                {withSet && <th scope="col">Set</th>}
                <th scope="col">Game</th>
            </tr>
        </thead>
        <tbody>
            {rows.map(([label, leg, set, game, hint]) => (
                <tr key={label}>
                    <th scope="row" title={hint}>{label}</th>
                    <td>{leg}</td>
                    {withSet && <td>{set}</td>}
                    <td>{game}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

/**
 * How a player is doing in the running game: the form, the key figures for
 * leg, set and game, the visits of this leg, and more behind a button.
 */
const X01StatisticsBoard = ({ playerId }) => {
    const { game, players } = useContext(X01Context);
    const [more, setMore] = useState(false);
    const pm = game.playerModels[playerId] || {};
    const set = `set-${game.currentSet}`;
    const leg = `leg-${game.currentSetLeg}`;
    const withSet = game.numberOfSets > 1;
    const player = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);

    // the three scopes of a stored figure: [leg, set, game]
    const scopes = (path, leaf) => [
        getNested(pm, [path, set, leg, ...leaf]),
        getNested(pm, [path, set, ...leaf]),
        getNested(pm, [path, 'game', ...leaf]),
    ];
    const averages = (kind) => [
        getNested(pm, ['averages', set, leg, kind === 'overall' ? 'overall' : `${kind}Leg`]),
        getNested(pm, ['averages', set, kind === 'overall' ? 'overall' : `${kind}Set`]),
        getNested(pm, ['averages', 'game', kind === 'overall' ? 'overall' : `${kind}Game`]),
    ].map(oneDecimal);
    const count = (ranges) => [
        getNested(pm, ['scoreRanges', set, leg], {}),
        getNested(pm, ['scoreRanges', set], {}),
        getNested(pm, ['scoreRanges', 'game'], {}),
    ].map(scope => ranges.reduce((sum, range) => sum + (Number(scope?.[range]) || 0), 0));

    const rows = [
        ['Average', ...averages('overall'), 'Points per visit of three darts'],
        ['Scoring', ...averages('begMid'), 'Average per visit while above 140'],
        ['Finishing', ...averages('end'), 'Average per visit at 140 and below'],
        ['Best visit', ...scopes('bestThreeDarts', ['value']).map(value => value || '–')],
        ['100+', ...count(TON_PLUS)],
        ['180s', ...count(['180'])],
    ];

    // the visits of this leg with what they left; a visit that took nothing off despite scoring is a bust
    let left = startingScoreOf(game, playerId);
    const visits = game.currentLegThrows.filter(visit => visit.playerId === playerId).map((visit, index) => {
        const scoreLeft = Number(visit.scoreLeft);
        const bust = left === scoreLeft && Number(visit.roundScore) > 0;
        left = scoreLeft;
        return { index: index + 1, darts: visit.darts, score: bust ? 0 : visit.roundScore, scoreLeft, bust };
    });

    const doubles = [...Array(20)].map((_, i) => [`D${i + 1}`, getNested(pm, ['checkout', 'sections', i + 1], null)])
        .concat([['Bull', getNested(pm, ['checkout', 'sections', '25'], null)]])
        .filter(([, section]) => section?.total > 0);

    return (
        <div className="x01-stats">
            <div className="x01-stats-name">{player?.nickname}</div>
            <X01FormCard game={game} playerId={playerId} />

            <FigureTable rows={rows} withSet={withSet} />

            <div className="x01-stats-visits">
                <div className="x01-stats-title">This leg</div>
                {visits.length
                    ? (
                        <ol className="x01-visit-list">
                            {visits.map(visit => (
                                <li key={visit.index} className={visit.bust ? 'is-bust' : ''}>
                                    <span className="x01-visit-number">{visit.index}</span>
                                    <span className="x01-visit-darts">{visit.darts.map((dart, i) => <span key={i}>{dart}</span>)}</span>
                                    <span className="x01-visit-score">{visit.bust ? 'Bust' : visit.score}</span>
                                    <span className="x01-visit-left">{visit.scoreLeft}</span>
                                </li>
                            ))}
                        </ol>
                    )
                    : <div className="text-faint fs-8">Starts at {startingScoreOf(game, playerId)}; no visits yet.</div>
                }
            </div>

            <Button
                type="button"
                label={more ? 'Less' : 'More statistics'}
                icon={more ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
                text
                size="small"
                className="w-100 justify-content-center"
                aria-expanded={more}
                onClick={() => setMore(!more)}
            />
            {more && <>
                <div className="x01-stats-title mt-2">Score per visit</div>
                <FigureTable
                    withSet={withSet}
                    rows={RANGES.map(range => [range === 'ZERO' ? '0' : range.replace('-', '–'), ...[
                        getNested(pm, ['scoreRanges', set, leg, range]),
                        getNested(pm, ['scoreRanges', set, range]),
                        getNested(pm, ['scoreRanges', 'game', range]),
                    ]])}
                />
                <div className="x01-stats-title mt-2">Checkout</div>
                <FigureTable
                    withSet={withSet}
                    rows={[['Highest', ...[
                        getNested(pm, ['checkoutScores', set, leg], {}),
                        getNested(pm, ['checkoutScores', set], {}),
                        getNested(pm, ['checkoutScores', 'game'], {}),
                    ].map(highestCheckout)]]}
                />
                {doubles.length > 0 &&
                    <div className="x01-stats-doubles">
                        {doubles.map(([label, section]) => (
                            <span key={label} title={`${section.hit} of ${section.total} darts at ${label} hit`}>
                                <strong>{label}</strong> {section.hit}/{section.total}
                            </span>
                        ))}
                    </div>
                }
            </>}
        </div>
    );
};

export default X01StatisticsBoard;
