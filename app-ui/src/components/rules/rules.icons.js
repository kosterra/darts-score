import { GiArcheryTarget, GiBaseballBat, GiBullseye, GiChessKnight, GiCycle, GiDiceTarget, GiGolfFlag, GiLadder, GiPerspectiveDiceSixFacesRandom, GiSkullCrossedBones, GiStairsGoal, GiTargetArrows } from 'react-icons/gi';
import { FaCrosshairs, FaDivide, FaFireFlameCurved, FaHand, FaHandHolding, FaStopwatch } from 'react-icons/fa6';

// the sign of every game and training of the rules engine, the same everywhere
export const RULES_ICONS = {
    shanghai: GiDiceTarget,
    killer: GiSkullCrossedBones,
    halveit: FaDivide,
    golf: GiGolfFlag,
    tactics: GiChessKnight,
    baseball: GiBaseballBat,
    scram: FaHand,
    bobs27: GiArcheryTarget,
    checkout121: GiStairsGoal,
    randomcheckouts: GiPerspectiveDiceSixFacesRandom,
    scoring: FaFireFlameCurved,
    doublesaround: GiCycle,
    catch40: FaHandHolding,
    trebles: FaCrosshairs,
    bulls: GiBullseye,
    ladder: GiLadder,
    shortleg: FaStopwatch,
};

export const rulesIcon = (kind) => RULES_ICONS[kind] ?? GiTargetArrows;
