import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { FaTrophy } from "react-icons/fa6";

import BadgeMedal from './badge.medal';
import Confetti from './confetti';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

/**
 * Full-screen celebration for a win or a new record: confetti, the player,
 * and the badges that were just earned.
 *
 * badgeGroups: [{ player: { nickname, ... }, badges: [badge] }]
 */
const Celebration = ({ title, subtitle, player, badgeGroups = [], onClose }) => {
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    let badgeIndex = 0;

    return createPortal(
        <div className="celebration" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
            <Confetti />
            <div className="celebration-card" onClick={(event) => event.stopPropagation()}>
                <FaTrophy className="celebration-trophy text-gold" aria-hidden="true" />
                <h2 className="celebration-title text-default fw-semibold m-0">{title}</h2>
                {player &&
                    <div className="d-flex flex-column align-items-center gap-2">
                        <Avatar
                            label={resolvePlayerInitials(player.firstname ?? '?', player.lastname ?? '')}
                            image={resolvePlayerImg(player.profileImg)}
                            shape="circle"
                            className="avatar-lg bg-surface-high"
                        />
                        <span className="fs-3 fw-semibold text-default text-break">{player.nickname}</span>
                    </div>
                }
                {subtitle && <p className="text-subtle m-0">{subtitle}</p>}

                {badgeGroups.length > 0 &&
                    <div className="d-flex flex-column gap-3 w-100">
                        <span className="fs-7 fw-semibold text-subtle text-uppercase" style={{ letterSpacing: '0.05em' }}>{t('New badges')}</span>
                        {badgeGroups.map(group => (
                            <div key={group.player.id} className="d-flex flex-column align-items-center gap-2">
                                {badgeGroups.length > 1 && <span className="text-default fw-semibold">{group.player.nickname}</span>}
                                <ul className="list-unstyled m-0 d-flex flex-wrap justify-content-center gap-3">
                                    {group.badges.map(badge => (
                                        <li key={badge.id} className="celebration-badge">
                                            <BadgeMedal badge={badge} animate delay={600 + 220 * badgeIndex++} />
                                            <span className="text-default fs-7 fw-semibold">{badge.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                }
                <Button label={t('Continue')} icon="pi pi-check" onClick={onClose} autoFocus />
            </div>
        </div>,
        document.body
    );
};

export default Celebration;
