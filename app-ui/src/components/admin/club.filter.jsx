import { MultiSelect } from 'primereact/multiselect';

import ClubLogo from '../elements/club.logo';

/**
 * Picks the clubs whose entries an admin list shows. Lists across clubs
 * always need at least one, so they never load everything at once.
 */
export const ClubFilter = ({ clubs, selectedIds, onChange }) => (
    <MultiSelect
        value={selectedIds}
        options={clubs}
        optionLabel="name"
        optionValue="id"
        onChange={(e) => onChange(e.value)}
        placeholder="Choose clubs"
        filter
        display="chip"
        maxSelectedLabels={3}
        selectedItemsLabel="{0} clubs"
        className={selectedIds.length ? '' : 'p-invalid'}
        aria-label="Clubs"
        style={{ minWidth: '14rem', maxWidth: '100%' }}
    />
);

/**
 * The club an entry belongs to, in the lists across clubs.
 */
export const ClubCell = ({ club }) => (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
        <ClubLogo club={club} />
        <span className="text-default fs-7 text-truncate">{club?.name ?? 'Unknown club'}</span>
    </div>
);

/**
 * Shown instead of a list across clubs until at least one club is chosen.
 */
export const ChooseClubsHint = ({ what }) => (
    <div className="text-center py-5 d-flex flex-column align-items-center gap-2">
        <i className="pi pi-filter text-faint fs-3" aria-hidden="true" />
        <span className="text-default fw-semibold">Choose one or more clubs</span>
        <span className="text-subtle fs-7">to see their {what}.</span>
    </div>
);
