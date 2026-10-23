import { GiArcheryTarget, GiChessKnight, GiCycle, GiDiceTarget, GiGolfFlag, GiPerspectiveDiceSixFacesRandom, GiSkullCrossedBones, GiStairsGoal, GiTargetArrows } from 'react-icons/gi';
import { FaDivide, FaFireFlameCurved, FaHandHolding } from 'react-icons/fa6';

// the sign of every game and training of the rules engine, the same everywhere
export const RULES_ICONS = {
    shanghai: GiDiceTarget,
    killer: GiSkullCrossedBones,
    halveit: FaDivide,
    golf: GiGolfFlag,
    tactics: GiChessKnight,
    bobs27: GiArcheryTarget,
    checkout121: GiStairsGoal,
    randomcheckouts: GiPerspectiveDiceSixFacesRandom,
    scoring: FaFireFlameCurved,
    doublesaround: GiCycle,
    catch40: FaHandHolding,
};

export const rulesIcon = (kind) => RULES_ICONS[kind] ?? GiTargetArrows;
