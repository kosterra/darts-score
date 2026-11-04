import { t } from '../../utils/i18n';

const WIDTH = 100;
const HEIGHT = 32;

/**
 * The points of a training so far as a small curve over the whole way (e.g.
 * D1 to the bull), every stretch in the colour of how close the end was:
 * green safe, amber a few misses away, red the next double has to be a hit.
 * points: [{ score, risk }], length: the steps of the whole training.
 */
const RulesProgress = ({ points, length }) => {
    if (points.length < 2) return null;
    const top = Math.max(...points.map(point => point.score)) * 1.1;
    const x = (index) => (index / length) * WIDTH;
    const y = (score) => HEIGHT - (Math.max(score, 0) / top) * HEIGHT;
    const now = points.at(-1);
    return (
        <svg className={`rules-progress is-${now.risk}`} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t('Points after every double')}>
            <line className="rules-progress-base" x1="0" x2={WIDTH} y1={HEIGHT} y2={HEIGHT} />
            {points.slice(1).map((point, index) => (
                <line key={index} className={`rules-progress-line is-${point.risk}`} x1={x(index)} y1={y(points[index].score)} x2={x(index + 1)} y2={y(point.score)} />
            ))}
        </svg>
    );
};

export default RulesProgress;
