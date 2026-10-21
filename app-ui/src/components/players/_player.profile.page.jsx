import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import PlayerService from '../../services/player.service';
import { PlayerProfileSkeleton } from '../elements/skeletons';
import PlayerStats from '../stats/players/player.stats';
import PlayerLatestGames from '../stats/players/player.latest.games';
import PlayerBadgeCollection from '../badges/player.badge.collection';
import UpLink from '../elements/up.link';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * A player's profile in the selected club: who they are, their key figures,
 * latest games, charts and badge collection (reachable as #badges).
 */
const PlayerProfilePage = () => {
    const { id } = useParams();
    const { hash } = useLocation();
    const { user } = useAuth();
    const [player, setPlayer] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setPlayer(null);
        setFailed(false);
        PlayerService.getPlayer(id).then(setPlayer).catch(() => setFailed(true));
    }, [id]);

    // A link to #badges (e.g. from the badges overview) or #hall-of-shame scrolls there once
    // the collection is shown. Charts above it are still loading and push it down, so it is
    // kept in view for a moment, until the visitor scrolls themselves.
    const onBadgesLoaded = () => {
        if (hash !== '#badges' && hash !== '#hall-of-shame') return;
        let stop = false;
        const userScrolls = () => { stop = true; };
        const events = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
        events.forEach(name => window.addEventListener(name, userScrolls, { once: true, passive: true }));
        const started = Date.now();
        const keepInView = () => {
            const target = document.getElementById(hash.slice(1));
            if (stop || !target || Date.now() - started > 3000) {
                events.forEach(name => window.removeEventListener(name, userScrolls));
                return;
            }
            if (Math.abs(target.getBoundingClientRect().top) > 20) target.scrollIntoView({ block: 'start' });
            setTimeout(keepInView, 150);
        };
        requestAnimationFrame(keepInView);
    };

    if (failed) {
        return (
            <div className="container-fluid p-4">
                <p className="text-subtle">{t('This player could not be found in the selected club.')}{' '}<Link to="/players">{t('All players')}</Link></p>
            </div>
        );
    }
    if (!player) return <PlayerProfileSkeleton />;

    return (
        <div className="container-fluid p-4 border-0">
            <UpLink to="/players" label={t('Players')} />
            <PlayerStats
                player={player}
                isOwn={player.user === user.id}
                afterFigures={<PlayerLatestGames player={player} />}
            />
            <section id="badges" className="mt-5" style={{ scrollMarginTop: '1rem' }}>
                <PlayerBadgeCollection playerId={player.id} onLoaded={onBadgesLoaded} />
            </section>
        </div>
    );
};

export default PlayerProfilePage;
