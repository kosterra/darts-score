import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import ClubService from '../../services/club.service';
import { CLUB_ROLES } from '../../services/user.service';
import ClubLogo from '../elements/club.logo';
import { useAuth } from '../../utils/auth.context';
import ClubMembership from './club.membership';
import ClubDirectory from './club.directory';
import { t, tn } from '../../utils/i18n';
import { ClubMedalRow } from '../badges/club.badges';
import CountryFlag from '../elements/country.flag';

/**
 * My clubs: the clubs the user runs or plays in, with what they do in each:
 * switching, the admin tools, and their own player there. New clubs start here.
 */
const ClubsPage = () => {
    const toast = useRef(null);
    const navigate = useNavigate();
    const { clubs, activeClub, refreshClubs, selectClub, isGlobalAdmin } = useAuth();

    // memberships accepted elsewhere, and the requests waiting, show up when the page opens
    useEffect(() => {
        if (!isGlobalAdmin) refreshClubs().catch(() => {});
    }, [isGlobalAdmin, refreshClubs]);

    const [newName, setNewName] = useState('');

    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const onCreate = async (event) => {
        event.preventDefault();
        try {
            const club = await ClubService.createClub(newName);
            setNewName('');
            await refreshClubs();
            // The first club becomes the one the app works in
            if (!activeClub) selectClub(club.id);
            toast.current.show({ severity: 'success', summary: t('Club created'), detail: club.name, life: 3000 });
        } catch (error) {
            showError(t('Create club'), error);
        }
    };

    const onSelect = (club) => {
        selectClub(club.id);
        navigate('/');
    };

    const showSuccess = (summary, detail) => toast.current.show({ severity: 'success', summary, detail, life: 3000 });

    // global admins look after the app and belong to no club
    if (isGlobalAdmin) {
        return (
            <div className="container-fluid p-4 border-0">
                <Panel header={t('My clubs')}>
                    <p className="text-subtle fs-7 m-0">
                        {t('Global admins look after the app and do not belong to a club. Every club is under')}{' '}<Link to="/admin/clubs">{t('Admin · Clubs')}</Link>{t('; to run a club or to play, use another account.')}
                    </p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={t('My clubs')}>
                <div className="my-clubs-top">
                    <p className="text-subtle fs-7 m-0">
                        {t('The clubs you run or play in. Switch between them here or at the top of the menu; Edit club holds everything about a club you run. How you appear as a player, your nickname, picture and the X01 tips, is on your')}{' '}<Link to="/profile#player">{t('profile')}</Link>.
                    </p>
                    <form onSubmit={onCreate} className="my-clubs-create">
                        <InputText
                            id="club-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t('Name of a new club')}
                            aria-label={t('Name of a new club')}
                            minLength={3}
                            maxLength={50}
                            required
                        />
                        <Button type="submit" label={t('Create club')} icon="pi pi-plus" size="small" />
                    </form>
                </div>

                {clubs.length === 0 &&
                    <p className="text-subtle fs-7 py-4 text-center m-0">
                        {t('You are not in a club yet. Create your own club to add players and start playing, or join a club below. A club admin can also give you a login as a player of their club.')}
                    </p>
                }

                <ul className="my-clubs list-unstyled m-0">
                    {clubs.map(club => {
                        const isAdmin = club.role === CLUB_ROLES.ADMIN;
                        const current = activeClub?.id === club.id;
                        return (
                            <li key={club.id} className={`my-club ${current ? 'is-current' : ''}`}>
                                <div className="my-club-head">
                                    <ClubLogo club={club} size="md" />
                                    <div className="my-club-title">
                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                            <span className="text-default fw-semibold fs-6 text-break">{club.name}{' '}<CountryFlag code={club.country} /></span>
                                            <Tag value={isAdmin ? t('Admin') : t('Player')} severity="secondary" />
                                            <Tag value={club.isPublic ? t('Public') : t('Private')} severity="secondary" />
                                            {club.joinPolicy && club.joinPolicy !== 'closed' && <Tag value={club.joinPolicy === 'open' ? t('Open to join') : t('Admins accept')} severity="secondary" />}
                                            {current && <Tag value={t('Current club')} severity="success" />}
                                        </div>
                                        <span className="text-faint fs-8 text-break">
                                            {club.playerCount} {club.playerCount === 1 ? t('player') : t('players')} · {club.admins.length === 1 ? t('Admin') : t('Admins')}: {club.admins.map(admin => `${admin.firstname} ${admin.lastname}`).join(', ')}
                                        </span>
                                        {club.description && <span className="text-subtle fs-8 text-break">{club.description}</span>}
                                        {/* the club's best badges: to all of them on its badges page */}
                                        {club.badges?.length > 0 && <ClubMedalRow badges={club.badges} count={club.badgeCount} />}
                                    </div>
                                    <div className="my-club-actions">
                                        {isAdmin && club.openJoinRequests > 0 &&
                                            <Button
                                                label={tn(club.openJoinRequests, '{{count}} request to join', '{{count}} requests to join')}
                                                icon="pi pi-user-plus"
                                                size="small"
                                                onClick={() => { selectClub(club.id); navigate('/players?requests=1'); }}
                                            />}
                                        {!current && <Button label={t('Switch to this club')} size="small" severity="secondary" onClick={() => onSelect(club)} />}
                                        {isAdmin && <Button label={t('Edit club')} icon="pi pi-pencil" size="small" severity="secondary" onClick={() => navigate(`/my-clubs/${club.id}`)} />}
                                    </div>
                                </div>
                                <ClubMembership club={club} onSuccess={showSuccess} onError={showError} />
                            </li>
                        );
                    })}
                </ul>
            </Panel>

            <ClubDirectory onSuccess={showSuccess} onError={showError} />

            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ClubsPage;
