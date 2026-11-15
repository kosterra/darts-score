import { trainingHitNames, trainingVisitDetails } from '../../rules/engine';
import { t } from '../../utils/i18n';

// a dart as the visits of a game show it: Hit and Miss, a miss of the board as Miss
const dartLabel = (dart) => (dart === 'H' ? t('Hit') : dart === 'M' || dart === '0' ? t('Miss') : dart);

/**
 * The darts of a training, a numbered line per visit, the darts as tags in even columns: the
 * target hit green, the next best amber, a single blue, a miss faint (each training's dartTone);
 * a hit named by what it was where the training knows it (D5, Bull); at the end of the line the
 * points of the visit (Scoring) or what was left, green with a tick where it was checked out.
 * Used by the training scoreboards and fair play. training: { darts, settings }.
 */
const TrainingVisits = ({ definition, training }) => {
    const details = trainingVisitDetails(definition, training);
    const hitNames = trainingHitNames(definition, training);
    let first = 0;
    return (
        <ol className="rules-board-visits list-unstyled" aria-label={t('Darts thrown')}>
            {details.map((visit, index) => {
                const start = first;
                first += visit.darts.length;
                return (
                    <li key={index} className={`rules-board-visit ${definition.visitTotal || visit.left != null ? 'has-total' : ''}`}>
                        <span className="rules-board-visit-number">{index + 1}</span>
                        {[0, 1, 2].map(d => {
                            const dart = visit.darts[d];
                            const tone = dart === undefined ? 'is-none' : dart === 'H' ? 'is-hit' : dart === 'M' || dart === '0' ? 'is-miss' : definition.dartTone?.(dart) ?? '';
                            return <span key={d} className={`rules-board-dart ${tone}`}>{dart === undefined ? '' : (dart === 'H' && hitNames?.[start + d]) || dartLabel(dart)}</span>;
                        })}
                        {definition.visitTotal && <span className="rules-board-visit-total tabular-nums">{definition.visitTotal(visit.darts)}</span>}
                        {visit.left != null &&
                            <span className={`rules-board-visit-total tabular-nums ${visit.out ? 'is-out' : 'is-left'}`} title={visit.out ? t('Checked out!') : undefined}>
                                {visit.out && <i className="pi pi-check" aria-hidden="true" />}
                                {visit.left}
                            </span>}
                    </li>
                );
            })}
        </ol>
    );
};

export default TrainingVisits;
