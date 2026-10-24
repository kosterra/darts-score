import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';

import PlayerService from '../../services/player.service';
import ClubLogo from '../elements/club.logo';
import { useAuth } from '../../utils/auth.context';
import { Lines } from '../elements/skeletons';
import { t } from '../../utils/i18n';

/**
 * On the page of a player, for an admin of several clubs: the clubs the
 * player is a member of, to add them to another club of the admin, move
 * them there or remove them from one. A player keeps at least one club.
 * onLeft(summary): the player left the club the page works in.
 */
const PlayerClubs = ({ player, onSaved, onError, onLeft }) => {
    const { clubs, activeClub } = useAuth();
    const adminClubs = clubs.filter(club => club.role === 'admin');
    const [memberships, setMemberships] = useState(null);
    const [clubToAdd, setClubToAdd] = useState(null);
    const [busy, setBusy] = useState(false);

    // the page makes a new error handler every time it draws: the latest one, without loading again
    const errorRef = useRef(onError);
    errorRef.current = onError;
    const load = useCallback(async () => {
        try {
            setMemberships(await PlayerService.loadPlayerClubs(player.id));
        } catch (error) {
            setMemberships([]);
            errorRef.current(t('Clubs of the player'), error);
        }
    }, [player.id]);
    useEffect(() => { load(); }, [load]);

    const memberOf = new Set((memberships ?? []).map(club => club.id));
    const otherClubs = adminClubs.filter(club => !memberOf.has(club.id));
    const isLastClub = (memberships ?? []).length <= 1;
    const nameOf = (clubId) => adminClubs.find(club => club.id === clubId)?.name ?? t('the club');

    const run = async (summary, action, leaves) => {
        setBusy(true);
        try {
            await action();
            setClubToAdd(null);
            if (leaves) return onLeft(summary);
            onSaved(summary);
            await load();
        } catch (error) {
            onError(summary, error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <p className="setting-title">{t('Member of')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2 pt-1">
                    {memberships === null && <Lines count={2} />}
                    {(memberships ?? []).map(club => (
                        <div key={club.id} className="d-flex align-items-center gap-3">
                            <ClubLogo club={club} />
                            <span className="text-default fw-semibold flex-grow-1 text-break">
                                {club.name}
                                {club.id === activeClub?.id && <span className="text-faint fw-normal fs-8">{' '}{t('· this club')}</span>}
                            </span>
                            {club.canManage !== false &&
                                <Button
                                    type="button"
                                    icon="pi pi-sign-out"
                                    label={t('Remove')}
                                    size="small"
                                    severity="danger"
                                    text
                                    disabled={busy || isLastClub}
                                    tooltip={isLastClub ? t('The only club of this player: delete the player instead') : undefined}
                                    tooltipOptions={{ position: 'top', showOnDisabled: true }}
                                    onClick={() => run(t('Removed from {{name}}', { name: club.name }), () => PlayerService.removePlayerFromClub(player.id, club.id), club.id === activeClub?.id)}
                                />
                            }
                        </div>
                    ))}
                    <span className="text-faint fs-8">{t('Removing ends the membership only: the games played in that club stay and keep showing the name.')}</span>
                </div>
            </div>
            <p className="setting-title">{t('Add or move to a club')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2 pt-1">
                    <Dropdown
                        value={clubToAdd}
                        options={otherClubs}
                        optionLabel="name"
                        optionValue="id"
                        onChange={(event) => setClubToAdd(event.value)}
                        placeholder={otherClubs.length ? t('Choose one of your clubs') : t('Already in all your clubs')}
                        disabled={!otherClubs.length}
                        filter={otherClubs.length > 8}
                        aria-label={t('Club to add the player to')}
                        className="w-100"
                    />
                    <div className="d-flex flex-wrap justify-content-end gap-2">
                        <Button
                            type="button"
                            icon="pi pi-arrow-right"
                            label={t('Move')}
                            size="small"
                            severity="secondary"
                            disabled={!clubToAdd || busy}
                            tooltip={t('Add to that club and leave this one')}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => run(t('Moved to {{nameOf}}', { nameOf: nameOf(clubToAdd) }), () => PlayerService.addPlayerToClub(player.id, clubToAdd, true), true)}
                        />
                        <Button
                            type="button"
                            icon="pi pi-plus"
                            label={t('Add')}
                            size="small"
                            disabled={!clubToAdd || busy}
                            tooltip={t('Member of both clubs')}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => run(t('Added to {{nameOf}}', { nameOf: nameOf(clubToAdd) }), () => PlayerService.addPlayerToClub(player.id, clubToAdd, false))}
                        />
                    </div>
                    <span className="text-faint fs-8">{t('Your clubs only. Add keeps the player here too; Move takes them out of this club, and the games in which every player moved along go with them.')}</span>
                </div>
            </div>
        </>
    );
};

export default PlayerClubs;
