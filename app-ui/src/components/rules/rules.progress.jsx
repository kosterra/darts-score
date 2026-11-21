import { t } from '../../utils/i18n';

const WIDTH = 100;
const HEIGHT = 32;

/**
 * The slopes of a smooth curve through the points that never swings past them (monotone cubic,
 * Fritsch–Carlson): flat at a peak or a dip, so the curve calms the steps without inventing highs.
 */
const slopesOf = (xs, ys) => {
    const n = xs.length;
    const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
    const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : (d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2)));
    d.forEach((slope, i) => {
        if (slope === 0) { m[i] = 0; m[i + 1] = 0; return; }
        const a = m[i] / slope;
        const b = m[i + 1] / slope;
        const h = Math.hypot(a, b);
        if (h > 3) { m[i] = (3 * a / h) * slope; m[i + 1] = (3 * b / h) * slope; }
    });
    return m;
};

/**
 * The points of a training so far as a small curve, centred: it grows from
 * the middle to both sides with every step, as wide as the whole way (e.g. D1
 * to the bull) at the end; every stretch in the colour of how close the end was:
 * green safe, amber a few misses away, red the next double has to be a hit.
 * points: [{ score, risk }], length: the steps of the whole training, reference: a figure to
 * measure the curve against (the usual hit rate), as a dashed line across, or null.
 */
const RulesProgress = ({ points, length, reference = null, label = t('Points after every double') }) => {
    // before the first step only the base line: the curve keeps its room, so the header does not
    // jump down with the first dart
    if (points.length < 2) {
        return (
            <svg className="rules-progress" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
                <line className="rules-progress-base" x1="0" x2={WIDTH} y1={HEIGHT} y2={HEIGHT} />
                {reference != null && <line className="rules-progress-reference" x1="0" x2={WIDTH} y1={HEIGHT / 11} y2={HEIGHT / 11} />}
            </svg>
        );
    }
    // a training without a set length (Doubles around the board): the curve as wide as the darts so far
    length = Math.max(length ?? 0, points.length - 1);
    // all misses so far: the curve along the bottom
    const top = Math.max(...points.map(point => point.score), reference ?? 0, 1) * 1.1;
    // the steps so far, centred in the width the whole way takes
    const offset = ((length - (points.length - 1)) / length) * WIDTH / 2;
    const x = (index) => offset + (index / length) * WIDTH;
    const y = (score) => HEIGHT - (Math.max(score, 0) / top) * HEIGHT;
    const now = points.at(-1);
    const xs = points.map((_, index) => x(index));
    const ys = points.map(point => y(point.score));
    const m = slopesOf(xs, ys);
    // one smooth piece per step, in the colour of that step
    const piece = (i) => {
        const dx = (xs[i + 1] - xs[i]) / 3;
        return `M ${xs[i]} ${ys[i]} C ${xs[i] + dx} ${ys[i] + m[i] * dx}, ${xs[i + 1] - dx} ${ys[i + 1] - m[i + 1] * dx}, ${xs[i + 1]} ${ys[i + 1]}`;
    };
    return (
        <svg className={`rules-progress is-${now.risk}`} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
            <line className="rules-progress-base" x1="0" x2={WIDTH} y1={HEIGHT} y2={HEIGHT} />
            {reference != null && <line className="rules-progress-reference" x1="0" x2={WIDTH} y1={y(reference)} y2={y(reference)} />}
            {points.slice(1).map((point, index) => (
                <path key={index} className={`rules-progress-line is-${point.risk}`} d={piece(index)} />
            ))}
        </svg>
    );
};

export default RulesProgress;
