import { useEffect, useState } from 'react';

import AdminService from '../../services/admin.service';

const STORAGE_KEY = 'darts-score.adminClubs';

const readStored = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
        return [];
    }
};

/**
 * The clubs a global admin picked for the admin lists. The choice is kept,
 * so moving between players, games and trainings stays in the same clubs.
 * "enabled" is false in a club's own lists, which never pick clubs.
 */
const useClubSelection = (enabled) => {
    const [clubs, setClubs] = useState([]);
    const [selectedIds, setSelectedIds] = useState(enabled ? readStored : []);

    useEffect(() => {
        if (!enabled) return;
        AdminService.loadClubs()
            .then(loaded => {
                setClubs(loaded);
                // forget clubs that were deleted in the meantime
                setSelectedIds(ids => {
                    const known = ids.filter(id => loaded.some(club => club.id === id));
                    return known.length === ids.length ? ids : known;
                });
            })
            .catch(() => setClubs([]));
    }, [enabled]);

    const select = (ids) => {
        setSelectedIds(ids);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch {
            // storage unavailable: the choice lasts until reload
        }
    };

    return { clubs, selectedIds, select };
};

export default useClubSelection;
