import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';

import ClubLogo from '../elements/club.logo';
import { PlayerCell } from './admin.common';
import { t } from '../../utils/i18n';

/**
 * The clubs a player is a member of: add them to another club, move them
 * there or remove them from a club. A player keeps at least one club.
 *
 * memberships: [{ id, name, logo, canManage }] (null while loading)
 * targets: the clubs the player can be added to
 * onAdd(clubId, { move }): "move" only when a current club is given
 * onRemove(club)
 * currentClubId: the club the list works in; moving leaves it
 */
const PlayerClubsDialog = ({ player, memberships, targets, currentClubId, onAdd, onRemove, onHide, onChange, onError }) => {
    const [clubToAdd, setClubToAdd] = useState(null);
    const [busy, setBusy] = useState(false);

    if (!player) return null;

    const memberOf = new Set((memberships ?? []).map(club => club.id));
    const otherClubs = targets.filter(club => !memberOf.has(club.id));
    const isLastClub = (memberships ?? []).length <= 1;
    const nameOf = (clubId) => targets.find(club => club.id === clubId)?.name ?? t('the club');

    const run = async (summary, action) => {
        setBusy(true);
        try {
            await action();
            setClubToAdd(null);
            await onChange(summary);
        } catch (error) {
            onError(summary, error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            header={t('Clubs of the player')}
            visible={Boolean(player)}
            onHide={() => { setClubToAdd(null); onHide(); }}
            style={{ width: 'min(34rem, 95vw)' }}
            blockScroll
        >
            <div className="d-flex flex-column gap-4">
                <PlayerCell player={player} />

                <div className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7">{t('Member of')}</span>
                    {memberships === null && <span className="text-faint fs-7">{t('Loading…')}</span>}
                    {(memberships ?? []).map(club => (
                        <div key={club.id} className="d-flex align-items-center gap-3 bg-surface-raised rounded-2 px-3 py-2">
                            <ClubLogo club={club} />
                            <span className="text-default fw-semibold flex-grow-1 text-break">
                                {club.name}
                                {club.id === currentClubId && <span className="text-faint fw-normal fs-8">{' '}{t('· this club')}</span>}
                            </span>
                            {club.canManage !== false &&
                                <Button
                                    icon="pi pi-sign-out"
                                    label={t('Remove')}
                                    size="small"
                                    severity="danger"
                                    text
                                    disabled={busy || isLastClub}
                                    tooltip={isLastClub ? t('The only club of this player: delete the player instead') : undefined}
                                    tooltipOptions={{ position: 'top', showOnDisabled: true }}
                                    onClick={() => run(t('Removed from {{name}}', { name: club.name }), () => onRemove(club))}
                                />
                            }
                        </div>
                    ))}
                    <span className="text-faint fs-8">
                        {t('Removing ends the membership only: the games played in that club stay and keep showing the name.')}
                    </span>
                </div>

                <div className="d-flex flex-column gap-2">
                    <label htmlFor="player-add-club" className="text-subtle fs-7">{currentClubId ? t('Add to or move to a club') : t('Add to a club')}</label>
                    <Dropdown
                        inputId="player-add-club"
                        value={clubToAdd}
                        options={otherClubs}
                        optionLabel="name"
                        optionValue="id"
                        onChange={(e) => setClubToAdd(e.value)}
                        placeholder={otherClubs.length ? t('Choose a club') : t('Already in all your clubs')}
                        disabled={!otherClubs.length || player.guest}
                        filter={otherClubs.length > 8}
                        className="w-100"
                    />
                    <div className="d-flex flex-wrap gap-2">
                        <Button
                            icon="pi pi-plus"
                            label={t('Add')}
                            size="small"
                            disabled={!clubToAdd || busy}
                            tooltip={t('Member of both clubs')}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => run(t('Added to {{nameOf}}', { nameOf: nameOf(clubToAdd) }), () => onAdd(clubToAdd, { move: false }))}
                        />
                        {currentClubId &&
                            <Button
                                icon="pi pi-arrow-right"
                                label={t('Move')}
                                size="small"
                                outlined
                                disabled={!clubToAdd || busy}
                                tooltip={t('Add to that club and leave this one')}
                                tooltipOptions={{ position: 'top' }}
                                onClick={() => run(t('Moved to {{nameOf}}', { nameOf: nameOf(clubToAdd) }), () => onAdd(clubToAdd, { move: true }))}
                            />
                        }
                    </div>
                    {player.guest && <span className="text-faint fs-8">{t('A guest belongs to the club of their game. Make them a club member to add them to other clubs.')}</span>}
                </div>
            </div>
        </Dialog>
    );
};

export default PlayerClubsDialog;
