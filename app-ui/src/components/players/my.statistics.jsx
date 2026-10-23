import { Link, Navigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import PageLoader from '../elements/page.loader';
import { useAuth } from '../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import { t } from '../../utils/i18n';

/**
 * /me: the user's own statistics in the selected club, e.g. as the start
 * page. Without a player there it says so.
 */
const MyStatistics = () => {
    const { activeClub, isGlobalAdmin } = useAuth();
    const players = useMyPlayers(!isGlobalAdmin);
    if (isGlobalAdmin) return <Navigate replace to="/" />;
    if (players === null) return <PageLoader />;
    const player = playerInClub(players, activeClub?.id);
    if (player) return <Navigate replace to={`/players/${player.id}`} />;
    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={t('My statistics')}>
                <p className="text-subtle fs-7 m-0">
                    {t('You do not play in')}{' '}{activeClub?.name ?? t('this club')}{t(', so there are no statistics of your own here.')}
                    {' '}{t('Switch to a club you play in, or add yourself as a player under')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>.
                </p>
            </Panel>
        </div>
    );
};

export default MyStatistics;
