import { Dragon, Gnome, Monster, Troll } from './one.eighty.figures';

const FIGURES = [Gnome, Monster, Dragon, Troll];
// where the top of each figure's head is in its 120 × 170 box, for the hat
const HEAD_TOP = [4, 18, 22, 20];

/**
 * A player's figure with a top hat: "landing" lets the hat fly in first (the
 * hat trick of Cricket), otherwise it is on from the start; either way it is
 * then lifted in greeting.
 */
const HatFigure = ({ playerIndex = 0, landing = false }) => {
    const index = playerIndex % FIGURES.length;
    const Figure = FIGURES[index];
    const top = HEAD_TOP[index];
    return (
        <svg viewBox="0 0 120 170" className="hat-trick-figure">
            <Figure sign={false} />
            <g className={`hat-trick-hat ${landing ? 'is-landing' : 'is-tipping'}`} style={{ '--head': `${top}px` }}>
                <g transform={`translate(0 ${top - 34})`}>
                    <ellipse cx="60" cy="32" rx="30" ry="6" fill="#1b1714" />
                    <rect x="42" y="2" width="36" height="30" rx="3" fill="#24201c" />
                    <rect x="42" y="22" width="36" height="6" fill="#e9ac2f" />
                    <ellipse cx="60" cy="2" rx="18" ry="3.5" fill="#34302b" />
                </g>
            </g>
        </svg>
    );
};

export default HatFigure;
