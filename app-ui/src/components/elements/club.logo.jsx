import { resolveClubLogo } from '../../utils/image.utils';

const initials = (name = '') =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('') || '?';

/**
 * A club's logo, or its initials on the brand green when it has none.
 * size: 'sm' (2.25rem), 'md' (3.5rem) or 'lg' (5rem).
 */
const ClubLogo = ({ club, size = 'sm', className = '' }) => {
    const logo = resolveClubLogo(club?.logo);
    return (
        <span className={`club-logo club-logo-${size} ${logo ? 'has-image' : ''} ${className}`} aria-hidden="true">
            {logo ? <img src={logo} alt="" /> : initials(club?.name)}
        </span>
    );
};

export default ClubLogo;
