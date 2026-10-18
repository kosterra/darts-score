import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { GiFeather } from 'react-icons/gi';
import { FaSoap } from 'react-icons/fa6';

import ShameMedal from './shame.medal';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

// tar running down from the top edge: where each drip hangs, how wide and long
const DRIPS = [
    [3, 2.2, 5], [9, 1.4, 9], [15, 2.8, 6.5], [22, 1.2, 11], [28, 2, 4], [35, 3, 8], [43, 1.5, 12.5], [50, 2.4, 6],
    [57, 1.3, 10], [63, 2.6, 5], [70, 1.6, 13], [77, 2.2, 7], [84, 1.2, 9.5], [90, 2.8, 5.5], [96, 1.6, 8],
];

// feathers floating down, each on its own path
const FEATHERS = Array.from({ length: 22 }, (_, index) => ({
    left: (index * 37) % 100,
    delay: (index % 7) * 0.45,
    duration: 4.5 + (index % 5) * 0.8,
    size: 1.1 + (index % 4) * 0.45,
    sway: index % 2 ? 1 : -1,
}));

// a few feathers stuck to each player
const STUCK = [[-12, 8, -35], [78, -6, 25], [88, 62, 70], [-6, 70, -80]];

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * The opposite of a celebration, right after a game: the players who got a
 * badge of the Hall of Shame are tarred and feathered.
 *
 * groups: [{ player, got: [shame badge] }]
 */
const TarredAndFeathered = ({ groups, onClose }) => {
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const names = groups.map(group => group.player.nickname);
    const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];

    return createPortal(
        <div className="tarred" role="dialog" aria-modal="true" aria-label="Tarred and feathered" onClick={onClose}>
            <div className="tarred-tar" aria-hidden="true">
                {DRIPS.map(([left, width, length], index) => (
                    <span key={index} className="tarred-drip" style={{ left: `${left}%`, width: `${width}rem`, '--length': `${length}rem`, animationDelay: `${(index % 5) * 0.12}s` }} />
                ))}
            </div>
            <div className="tarred-feathers" aria-hidden="true">
                {FEATHERS.map((feather, index) => (
                    <GiFeather
                        key={index}
                        className="tarred-feather"
                        style={{ left: `${feather.left}%`, fontSize: `${feather.size}rem`, animationDelay: `${0.8 + feather.delay}s`, animationDuration: `${feather.duration}s`, '--sway': feather.sway }}
                    />
                ))}
            </div>
            <div className="tarred-card" onClick={(event) => event.stopPropagation()}>
                <h2 className="tarred-title m-0">Tarred and feathered!</h2>
                <p className="text-subtle m-0">{who} landed in the Hall of Shame</p>
                <div className="d-flex flex-wrap justify-content-center gap-4 w-100">
                    {groups.map(group => (
                        <div key={group.player.id} className="d-flex flex-column align-items-center gap-3" style={{ minWidth: '12rem', flex: '1 1 12rem' }}>
                            <span className="tarred-avatar">
                                <Avatar
                                    label={resolvePlayerInitials(group.player.firstname ?? '?', group.player.lastname ?? '')}
                                    image={resolvePlayerImg(group.player.profileImg)}
                                    shape="circle"
                                    className="avatar-lg bg-surface-high"
                                />
                                {[[28, '28%'], [52, '40%'], [68, '22%']].map(([left, height]) => (
                                    <span key={left} className="tarred-avatar-drip" style={{ left: `${left}%`, height }} aria-hidden="true" />
                                ))}
                                {STUCK.map(([x, y, turn], index) => (
                                    <GiFeather key={index} className="tarred-stuck" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${turn}deg)` }} aria-hidden="true" />
                                ))}
                            </span>
                            <span className="fs-4 fw-semibold text-default text-break">{group.player.nickname}</span>
                            <ul className="list-unstyled m-0 d-flex flex-column gap-3 w-100">
                                {group.got.map(badge => (
                                    <li key={badge.id} className="tarred-badge">
                                        <ShameMedal badge={badge} size="sm" />
                                        <div className="d-flex flex-column text-start" style={{ minWidth: 0 }}>
                                            <span className="text-default fw-semibold">{badge.title}{badge.count > 1 ? ` × ${badge.count}` : ''}</span>
                                            <span className="tarred-wash"><FaSoap aria-hidden="true" /> {badge.wash ? `Wash it off: ${lowerFirst(badge.wash)}` : ''}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <Button label="Oh no" severity="secondary" onClick={onClose} autoFocus />
            </div>
        </div>,
        document.body
    );
};

export default TarredAndFeathered;
