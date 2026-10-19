import { useEffect, useState } from 'react';

import IntegrityService from '../../services/integrity.service';
import { LEVELS } from './fair.play.lists';

// the worst finding at each place: 'set|leg|visit' (X01) or 'visit' → level
const flagsOf = (findings) => {
    const flags = new Map();
    for (const item of findings) {
        for (const place of item.places ?? []) {
            const key = place.set ? `${place.set}|${place.leg}|${place.visit}` : String(place.visit);
            if (!flags.has(key) || LEVELS[item.level] > LEVELS[flags.get(key)]) flags.set(key, item.level);
        }
    }
    return flags;
};

const Darts = ({ darts }) => <span className="fair-play-darts">{darts.length ? darts.join(' ') : '–'}</span>;

/**
 * The legs of an X01 game: each visit with what was saved as left, and where
 * it does not add up what it should be and what a repair would save.
 */
const X01Legs = ({ legs, flags, nameOf, repairable }) => {
    const [all, setAll] = useState(false);
    const flagged = legs.filter(leg => leg.visits.some((_, index) => flags.has(`${leg.set}|${leg.leg}|${index}`)));
    const shown = all || !flagged.length ? legs : flagged;
    const sets = new Set(legs.map(leg => leg.set)).size;

    return (
        <div className="fair-play-legs">
            {!flagged.length && <p className="text-faint fs-8 m-0">The findings concern the whole game, not a single visit.</p>}
            {shown.map(leg => (
                <div key={`${leg.set}-${leg.leg}`} className="fair-play-leg">
                    <div className="fair-play-leg-title">{sets > 1 ? `Set ${leg.set} · Leg ${leg.leg}` : `Leg ${leg.leg}`}</div>
                    <table className="fair-play-visits">
                        <thead>
                            <tr><th>Player</th><th>Darts</th><th className="text-end col-scored">Scored</th><th className="text-end">Left</th></tr>
                        </thead>
                        <tbody>
                            {leg.visits.map((visit, index) => {
                                const level = flags.get(`${leg.set}|${leg.leg}|${index}`);
                                const wrong = visit.expected !== null && visit.scoreLeft !== null && visit.expected !== visit.scoreLeft;
                                return (
                                    <tr key={index} className={level ? `is-${level}` : ''}>
                                        <td>{nameOf(visit.playerId)}</td>
                                        <td><Darts darts={visit.darts} /></td>
                                        <td className="text-end col-scored">{visit.roundScore ?? '–'}</td>
                                        <td className="text-end">
                                            <span className={wrong ? 'fair-play-wrong' : ''}>{visit.scoreLeft ?? '–'}</span>
                                            {wrong && <span className="fair-play-should">{visit.before} − darts → {visit.expected}</span>}
                                            {repairable && visit.repaired !== null && visit.repaired !== visit.scoreLeft &&
                                                <span className="fair-play-repaired">repair: {visit.repaired}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
            {flagged.length > 0 && flagged.length < legs.length &&
                <button type="button" className="fair-play-more" onClick={() => setAll(value => !value)}>
                    {all ? 'Only the legs with findings' : `All ${legs.length} legs`}
                </button>
            }
        </div>
    );
};

// Cricket and Elimination: the visits with findings, with two before and after
const Visits = ({ visits, flags, nameOf }) => {
    const marked = visits.map((_, index) => index).filter(index => flags.has(String(index)));
    if (!marked.length) return <p className="text-faint fs-8 m-0">The findings concern the whole game, not a single visit.</p>;
    const near = new Set(marked.flatMap(index => [index - 2, index - 1, index, index + 1, index + 2]));
    return (
        <table className="fair-play-visits">
            <thead>
                <tr><th>Visit</th><th>Player</th><th>Darts</th><th className="text-end">Scored</th></tr>
            </thead>
            <tbody>
                {visits.map((visit, index) => near.has(index) && (
                    <tr key={index} className={flags.has(String(index)) ? `is-${flags.get(String(index))}` : ''}>
                        <td>{index + 1}</td>
                        <td>{nameOf(visit.playerId)}</td>
                        <td><Darts darts={visit.darts} />{visit.bust && <span className="text-faint"> · bust</span>}</td>
                        <td className="text-end">{visit.roundScore ?? '–'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

/**
 * A closer look at a game or training on the fair play list: what was thrown,
 * so the finding can be checked before anything is deleted.
 */
const FairPlayDetails = ({ entry }) => {
    const [details, setDetails] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        IntegrityService.loadDetails(entry.type, entry.id).then(setDetails).catch(() => setFailed(true));
    }, [entry.type, entry.id]);

    if (failed) return <div className="fair-play-details text-faint fs-8">The details could not be loaded.</div>;
    if (!details) return <div className="fair-play-details text-faint fs-8">Loading…</div>;

    const nameOf = (id) => entry.players.find(player => player.id === id)?.nickname ?? 'Unknown player';
    const flags = flagsOf(details.findings ?? []);

    return (
        <div className="fair-play-details">
            {details.legs && <X01Legs legs={details.legs} flags={flags} nameOf={nameOf} repairable={details.repairable} />}
            {details.visits && <Visits visits={details.visits} flags={flags} nameOf={nameOf} />}
            {details.facts &&
                <dl className="fair-play-facts">
                    {details.facts.map(([label, value]) => (
                        <div key={label}>
                            <dt>{entry.players.some(player => player.id === label) ? nameOf(label) : label}</dt>
                            <dd>{label === 'Saved' ? new Date(value).toLocaleString() : value}</dd>
                        </div>
                    ))}
                </dl>
            }
            {details.repairReason && <p className="text-faint fs-8 m-0">No repair: {details.repairReason.charAt(0).toLowerCase() + details.repairReason.slice(1)}.</p>}
        </div>
    );
};

export default FairPlayDetails;
