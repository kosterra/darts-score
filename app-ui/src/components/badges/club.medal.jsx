import { FaBolt, FaCakeCandles, FaCalendarDays, FaChessBoard, FaDragon, FaDumbbell, FaFish, FaGem, FaLock, FaMoon, FaRoute, FaShieldHalved, FaUsers } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';
import { t } from '../../utils/i18n';

const GROUP_ICONS = {
    clubGames: GiDart,
    clubDarts: FaRoute,
    club180s: FaBolt,
    clubNight: FaMoon,
    clubWeeks: FaCalendarDays,
    clubMembers: FaUsers,
    clubAnniversary: FaCakeCandles,
    clubEveryGame: FaChessBoard,
    clubEveryTraining: FaDumbbell,
    clubFirst180: FaBolt,
    clubFirstBigFish: FaFish,
    clubFirstNineDarter: FaGem,
    clubFirstShanghai: FaDragon,
};

const METALS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend'];
// one of a kind is gold; in a series the metal rises with the tier, as the players' badges
const metalOf = (badge) => badge.tiers === 1 ? 'gold' : METALS[Math.min(badge.tier, METALS.length) - 1];

/**
 * A badge the club earned together: a shield instead of the round medal of a
 * player, on the metal of its tier. Not earned yet: grey with a lock.
 */
const ClubMedal = ({ badge, locked = false, size = 'md', animate = false }) => {
    const Icon = GROUP_ICONS[badge.group] ?? FaShieldHalved;
    return (
        <span
            className={`badge-medal badge-club badge-medal-${size} badge-${locked ? 'locked' : metalOf(badge)} ${animate ? 'badge-pop' : ''}`}
            role="img"
            aria-label={`${badge.title}${locked ? t(' (not earned yet)') : ''}`}
            title={`${badge.title}: ${badge.description}`}
        >
            <Icon aria-hidden="true" />
            {locked && <FaLock className="badge-lock" aria-hidden="true" />}
        </span>
    );
};

export default ClubMedal;
