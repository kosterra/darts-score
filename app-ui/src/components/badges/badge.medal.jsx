import { FaTrophy, FaFire, FaBolt, FaFlagCheckered, FaBullseye, FaFish, FaBroom, FaChartLine, FaBaseballBatBall, FaSkull, FaStar, FaRoute, FaClock, FaStopwatch, FaLock, FaDragon, FaGem, FaHouseCrack, FaBed, FaArrowTrendUp, FaCalendarCheck, FaBoltLightning, FaArrowsSpin } from "react-icons/fa6";
import { GiDart } from "react-icons/gi";

const GROUP_ICONS = {
    games: GiDart,
    wins: FaTrophy,
    streak: FaFire,
    max180: FaBolt,
    highFinish: FaFlagCheckered,
    bullFinish: FaBullseye,
    bigFish: FaFish,
    shanghai: FaDragon,
    nineDarter: FaGem,
    madhouse: FaHouseCrack,
    bedAndBreakfast: FaBed,
    maxHatTrick: FaBoltLightning,
    comeback: FaArrowTrendUp,
    weekStreak: FaCalendarCheck,
    whitewash: FaBroom,
    average: FaChartLine,
    cricketWins: FaBaseballBatBall,
    eliminationWins: FaSkull,
    clockWins: FaArrowsSpin,
    allRounder: FaStar,
    darts: FaRoute,
    training: FaClock,
    records: FaStopwatch,
};

const METALS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend'];

// One-of-a-kind badges are gold; in a series the metal rises with the tier
const badgeMetal = (badge) => badge.tiers === 1 ? 'gold' : METALS[Math.min(badge.tier, METALS.length) - 1];

/**
 * A badge as a medal: the group's icon on the metal of its tier. Badges not
 * earned yet are greyed out with a lock.
 */
const BadgeMedal = ({ badge, locked = false, size = 'md', animate = false, delay = 0 }) => {
    const Icon = GROUP_ICONS[badge.group] ?? FaStar;

    return (
        <span
            className={`badge-medal badge-medal-${size} badge-${locked ? 'locked' : badgeMetal(badge)} ${animate ? 'badge-pop' : ''}`}
            style={animate ? { animationDelay: `${delay}ms` } : undefined}
            role="img"
            aria-label={`${badge.title}${locked ? ' (not earned yet)' : ''}`}
            title={`${badge.title}: ${badge.description}`}
        >
            <Icon aria-hidden="true" />
            {locked && <FaLock className="badge-lock" aria-hidden="true" />}
        </span>
    );
};

export default BadgeMedal;
