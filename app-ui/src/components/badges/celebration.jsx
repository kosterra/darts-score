import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from 'primereact/avatar';
import { FaTrophy } from "react-icons/fa6";

import BadgeMedal from './badge.medal';
import Confetti from './confetti';
import useGamePreferences from '../../utils/use.game.preferences';
import useFleeting from '../games/common/use.fleeting';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { tn } from '../../utils/i18n';

// a burst plays this long; the top tier of a badge series a little longer
const BURST_MS = 4500;
const RARE_MS = 9000;

// rare: the highest tier of a series of three or more
const isRareBadge = (badge) => badge.tiers >= 3 && badge.tier === badge.tiers;

/**
 * A celebration for a win or a new record: confetti over the page and a
 * small card on top with the player, without holding the page up. It goes by
 * itself after a few seconds, at once on a tap or a key; what was earned stays
 * on the page (the badges of the game, the result). Only the top tier of a
 * badge series gets the bigger card in the middle, with its medals.
 *
 * badgeGroups: [{ player: { nickname, ... }, badges: [badge] }]
 */
const Celebration = ({ title, subtitle, player, badgeGroups = [], onClose }) => {
    // a player who likes it quieter: the card without the confetti
    const [{ celebrations }] = useGamePreferences();
    // the page may give a new function on every render: the timer keeps running
    const close = useRef(onClose);
    useEffect(() => { close.current = onClose; }, [onClose]);
    const done = useCallback(() => close.current?.(), []);

    const rare = badgeGroups.flatMap(group => group.badges).filter(isRareBadge);
    const count = badgeGroups.reduce((sum, group) => sum + group.badges.length, 0);
    const leaving = useFleeting(true, done, rare.length ? RARE_MS : BURST_MS);

    return createPortal(
        <div className={`celebration ${rare.length ? 'is-rare' : 'is-burst'} ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite">
            {celebrations !== 'quiet' && <Confetti />}
            <div className="celebration-card">
                <FaTrophy className="celebration-trophy text-gold" aria-hidden="true" />
                <div className="d-flex flex-column align-items-center gap-1">
                    <span className="celebration-title text-default fw-semibold">{title}</span>
                    {player &&
                        <span className="d-flex align-items-center gap-2">
                            <Avatar
                                label={resolvePlayerInitials(player.firstname ?? '?', player.lastname ?? '')}
                                image={resolvePlayerImg(player.profileImg)}
                                shape="circle"
                                className="avatar-sm bg-surface-high"
                            />
                            <span className="fw-semibold text-default text-break">{player.nickname}</span>
                            {subtitle && <span className="text-subtle">{subtitle}</span>}
                        </span>
                    }
                    {!player && subtitle && <span className="text-subtle">{subtitle}</span>}
                    {!rare.length && count > 0 && <span className="text-gold fs-8 fw-semibold">{tn(count, '{{count}} new badge', '{{count}} new badges')}</span>}
                </div>
                {rare.length > 0 &&
                    <ul className="list-unstyled m-0 d-flex flex-wrap justify-content-center gap-3">
                        {rare.map((badge, index) => (
                            <li key={badge.id} className="celebration-badge">
                                <BadgeMedal badge={badge} animate delay={400 + 220 * index} />
                                <span className="text-default fs-7 fw-semibold">{badge.title}</span>
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>,
        document.body
    );
};

export default Celebration;
