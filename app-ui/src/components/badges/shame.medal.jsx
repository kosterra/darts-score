import { FaBed, FaHouseCrack, FaCircleXmark, FaBomb, FaAnchor, FaFlag, FaWineBottle, FaSpoon, FaSnowflake, FaSkull, FaPersonFallingBurst, FaDroplet, FaHandcuffs, FaScissors, FaTree, FaDoorClosed, FaArrowTrendDown } from 'react-icons/fa6';

const SHAME_ICONS = {
    bedAndBreakfast: FaBed,
    madhouse: FaHouseCrack,
    nothingDoing: FaCircleXmark,
    bustMaster: FaBomb,
    stuckOnTheDouble: FaAnchor,
    whitewashed: FaFlag,
    bottledIt: FaWineBottle,
    woodenSpoon: FaSpoon,
    coldSpell: FaSnowflake,
    friendlyFire: FaPersonFallingBurst,
    firstBlood: FaDroplet,
    shanghaied: FaHandcuffs,
    halfWit: FaScissors,
    inTheRough: FaTree,
    lockedOut: FaDoorClosed,
    bobsBust: FaArrowTrendDown,
};

/**
 * A badge of the Hall of Shame, round like the other badges but in a dull rust.
 * "washed" greys it out: the player washed it off (or never had it).
 */
const ShameMedal = ({ badge, size = 'md', washed = false, title }) => {
    const Icon = SHAME_ICONS[badge.id] ?? FaSkull;
    return (
        <span
            className={`badge-medal badge-medal-${size} ${washed ? 'badge-locked' : 'badge-shame'}`}
            role="img"
            aria-label={badge.title}
            title={title ?? `${badge.title}: ${badge.description}`}
        >
            <Icon aria-hidden="true" />
        </span>
    );
};

export default ShameMedal;
