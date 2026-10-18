import { MultiSelect } from 'primereact/multiselect';

import ClubLogo from '../elements/club.logo';

/**
 * Picks the clubs whose entries an admin list shows. Lists across clubs
 * always need at least one, so they never load everything at once; with
 * "optional" none means all (e.g. the users).
 */
export const ClubFilter = ({ clubs, selectedIds, onChange, optional = false }) => (
    <MultiSelect
        value={selectedIds}
        options={clubs}
        optionLabel="name"
        optionValue="id"
        onChange={(e) => onChange(e.value)}
        placeholder={optional ? 'All clubs' : 'Choose clubs'}
        filter
        display="chip"
        // a plain cross on the chosen clubs, like the labels
        removeIcon="pi pi-times"
        maxSelectedLabels={3}
        selectedItemsLabel="{0} clubs"
        className={selectedIds.length || optional ? '' : 'p-invalid'}
        aria-label="Clubs"
        style={{ minWidth: '14rem', maxWidth: '100%' }}
    />
);

/**
 * The club an entry belongs to, in the lists across clubs; "detail" is a line
 * under the name, e.g. the user's role in the club.
 */
export const ClubCell = ({ club, detail }) => (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
        <ClubLogo club={club} />
        <span className="d-flex flex-column" style={{ minWidth: 0 }}>
            <span className="text-default fs-7 text-truncate">{club?.name ?? 'Unknown club'}</span>
            {detail && <span className="text-faint fs-8">{detail}</span>}
        </span>
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
