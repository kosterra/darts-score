import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';

import AdminService from '../../services/admin.service';
import ClubLogo from '../elements/club.logo';
import { PlayerCell } from './admin.common';

/**
 * For global admins: the clubs a player is a member of, adding them to
 * another club and removing them from one. A player keeps at least one club.
 */
const PlayerClubsDialog = ({ player, clubs, onHide, onChange, onError }) => {
    const [clubToAdd, setClubToAdd] = useState(null);
    const [busy, setBusy] = useState(false);

    if (!player) return null;

    const memberOf = new Set(player.clubs.map(club => club.id));
    const otherClubs = clubs.filter(club => !memberOf.has(club.id));
    const isLastClub = player.clubs.length === 1;

    const run = async (summary, action) => {
        setBusy(true);
        try {
            await action();
            await onChange(summary);
        } catch (error) {
            onError(summary, error);
        } finally {
            setBusy(false);
        }
    };

    const add = () => run(`Added to ${clubs.find(club => club.id === clubToAdd)?.name}`, async () => {
        await AdminService.addPlayerToClub(player.id, clubToAdd);
        setClubToAdd(null);
    });

    const remove = (club) => run(`Removed from ${club.name}`, () => AdminService.removePlayerFromClub(player.id, club.id));

    return (
        <Dialog
            header="Clubs of the player"
            visible={Boolean(player)}
            onHide={() => { setClubToAdd(null); onHide(); }}
            style={{ width: 'min(34rem, 95vw)' }}
            blockScroll
        >
            <div className="d-flex flex-column gap-4">
                <PlayerCell player={player} />

                <div className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7">Member of</span>
                    {player.clubs.map(club => (
                        <div key={club.id} className="d-flex align-items-center gap-3 bg-surface-raised rounded-2 px-3 py-2">
                            <ClubLogo club={club} />
                            <span className="text-default fw-semibold flex-grow-1 text-break">{club.name}</span>
                            <Button
                                icon="pi pi-sign-out"
                                label="Remove"
                                size="small"
                                severity="danger"
                                text
                                disabled={busy || isLastClub}
                                tooltip={isLastClub ? 'The only club of this player: delete the player instead' : undefined}
                                tooltipOptions={{ position: 'top', showOnDisabled: true }}
                                onClick={() => remove(club)}
                            />
                        </div>
                    ))}
                    <span className="text-faint fs-8">
                        Removing ends the membership only: the games played in that club stay and keep showing the name.
                    </span>
                </div>

                <div className="d-flex flex-column gap-2">
                    <label htmlFor="player-add-club" className="text-subtle fs-7">Add to a club</label>
                    <div className="d-flex gap-2">
                        <Dropdown
                            inputId="player-add-club"
                            value={clubToAdd}
                            options={otherClubs}
                            optionLabel="name"
                            optionValue="id"
                            onChange={(e) => setClubToAdd(e.value)}
                            placeholder={otherClubs.length ? 'Choose a club' : 'Member of every club'}
                            disabled={!otherClubs.length || player.guest}
                            filter={otherClubs.length > 8}
                            className="flex-grow-1"
                        />
                        <Button icon="pi pi-plus" label="Add" disabled={!clubToAdd || busy} onClick={add} />
                    </div>
                    {player.guest && <span className="text-faint fs-8">A guest belongs to the club of their game. Make them a club member to add them to other clubs.</span>}
                </div>
            </div>
        </Dialog>
    );
};

export default PlayerClubsDialog;
