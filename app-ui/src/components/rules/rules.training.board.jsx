import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import RulesService from '../../services/rules.service';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

const VIEWS = [
    { label: t('Best'), value: 'best' },
    { label: t('Recent'), value: 'recent' },
];

/**
 * The scoreboard of a training in the club: every player's best, or the
 * latest attempts. "highlight" marks the attempt just saved.
 */
const RulesTrainingBoard = ({ definition, version = 0, highlight = null }) => {
    const [entries, setEntries] = useState(null);
    const [view, setView] = useState('best');

    useEffect(() => {
        let current = true;
        RulesService.loadTrainings(definition.id)
            .then(loaded => { if (current) setEntries(loaded); })
            .catch(() => { if (current) setEntries([]); });
        return () => { current = false; };
    }, [definition.id, version]);

    const higher = definition.higherIsBetter !== false;
    const better = (a, b) => (higher ? b.score - a.score : a.score - b.score);
    let rows = entries ?? [];
    if (view === 'best') {
        const best = new Map();
        rows.forEach(entry => {
            const known = best.get(entry.player?.id);
            if (!known || better(entry, known) < 0) best.set(entry.player?.id, entry);
        });
        rows = [...best.values()].sort(better);
    }
    rows = rows.slice(0, 15);

    return (
        <Panel header={t('Scoreboard')} className="h-100">
            <div className="d-flex justify-content-center mb-3">
                <SelectButton value={view} options={VIEWS} onChange={(e) => e.value && setView(e.value)} className="p-selectbutton-pills" aria-label={t('Scoreboard')} />
            </div>
            {entries === null
                ? <span className="text-faint fs-8">{t('Loading…')}</span>
                : rows.length === 0
                    ? <span className="text-faint fs-8">{t('Nobody has played this training yet.')}</span>
                    : <table className="rules-scoreboard">
                        <tbody>
                            {rows.map((entry, index) => (
                                <tr key={entry.id} className={entry.id === highlight ? 'is-current' : ''}>
                                    <td>{view === 'best' ? `${index + 1}. ` : ''}{entry.player?.nickname ?? t('Unknown player')}</td>
                                    <td>{definition.format(entry.score)}</td>
                                    <td className="text-faint fs-8">{formatDate(entry.createdAt, { year: 'short' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}
        </Panel>
    );
};

export default RulesTrainingBoard;
