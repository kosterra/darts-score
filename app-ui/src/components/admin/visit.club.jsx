import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';

import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { useVisit } from './use.visit';

// a link to a page of a club, for the lists across clubs
export const VisitLink = ({ clubId, to, className, title, children }) => {
    const visit = useVisit();
    const [busy, setBusy] = useState(false);
    return (
        <a href={to} className={className} title={title} aria-label={title} aria-busy={busy}
            onClick={async (event) => {
                event.preventDefault();
                setBusy(true);
                try {
                    await visit(clubId, to);
                } finally {
                    setBusy(false);
                }
            }}>
            {children}
        </a>
    );
};

// on top of every page while a global admin looks at a club: which one, and the way back
export const VisitBar = () => {
    const { activeClub, leaveVisit } = useAuth();
    const navigate = useNavigate();
    if (!activeClub?.visiting) return null;
    return (
        <div className="visit-bar" role="status">
            <i className="pi pi-eye" aria-hidden="true" />
            <span className="flex-grow-1 min-w-0">{t('You are looking at {{club}} as a global admin, with the rights of its admins.', { club: activeClub.name })}</span>
            <Button label={t('Back to the administration')} icon="pi pi-arrow-left" size="small" text onClick={() => navigate(leaveVisit())} />
        </div>
    );
};
