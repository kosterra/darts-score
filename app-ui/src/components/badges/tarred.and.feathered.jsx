import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from 'primereact/avatar';
import { GiFeather } from 'react-icons/gi';

import ShameMedal from './shame.medal';
import useFleeting from '../games/common/use.fleeting';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

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

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

// as long as the tar and the feathers need to fall
const SHAME_MS = 6000;

/**
 * The opposite of a celebration, right after a game: the players who got a
 * badge of the Hall of Shame are tarred and feathered, over the page without
 * holding it up; it goes by itself, at once on a tap or a key.
 *
 * groups: [{ player, got: [shame badge] }]
 */
const TarredAndFeathered = ({ groups, onClose }) => {
    const close = useRef(onClose);
    useEffect(() => { close.current = onClose; }, [onClose]);
    const done = useCallback(() => close.current?.(), []);
    const leaving = useFleeting(true, done, SHAME_MS);

    const names = groups.map(group => group.player.nickname);
    const who = names.length > 1 ? t('{{join}} and {{at}}', { join: names.slice(0, -1).join(', '), at: names.at(-1) }) : names[0];

    return createPortal(
        <div className={`tarred ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label={t('Tarred and feathered')}>
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
            {/* short and at the bottom: the page stays in view; what was got is in its Hall of Shame panel */}
            <div className="tarred-card is-compact">
                <span className="tarred-title">{t('Tarred and feathered!')}</span>
                <span className="text-subtle fs-7">{who}{' '}{t('landed in the Hall of Shame')}</span>
                <div className="d-flex flex-wrap justify-content-center gap-3">
                    {groups.map(group => (
                        <div key={group.player.id} className="d-flex align-items-center gap-2">
                            <span className="tarred-avatar is-small">
                                <Avatar
                                    label={resolvePlayerInitials(group.player.firstname ?? '?', group.player.lastname ?? '')}
                                    image={resolvePlayerImg(group.player.profileImg)}
                                    shape="circle"
                                    className="avatar-sm bg-surface-high"
                                />
                                {[[30, '30%'], [60, '42%']].map(([left, height]) => (
                                    <span key={left} className="tarred-avatar-drip" style={{ left: `${left}%`, height }} aria-hidden="true" />
                                ))}
                            </span>
                            {group.got.map(badge => (
                                <span key={badge.id} className="d-inline-flex align-items-center gap-1" title={badge.wash ? t('Wash it off: {{lowerFirst}}', { lowerFirst: lowerFirst(badge.wash) }) : undefined}>
                                    <ShameMedal badge={badge} size="xs" />
                                    <span className="text-default fs-8 fw-semibold">{badge.title}{badge.count > 1 ? t(' × {{count}}', { count: badge.count }) : ''}</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TarredAndFeathered;
