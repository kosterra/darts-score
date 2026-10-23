import { FaBullseye } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { PiClockClockwiseBold, PiClockCountdownBold } from 'react-icons/pi';
import { FaRobot } from 'react-icons/fa6';
import { GAMES } from '../../rules/games';
import { RULES_ICONS } from '../rules/rules.icons';

// the icons of the games in the menu, so a game is known by the same sign everywhere
// the trainings too: Around the Clock (atc), X01 against the bot (bot), Bob's 27 & co.
const ICONS = { x01: FaBullseye, cricket: MdSportsCricket, elimination: BiTargetLock, clock: PiClockClockwiseBold, atc: PiClockCountdownBold, bot: FaRobot, ...RULES_ICONS };
const LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock', ...Object.fromEntries(GAMES.map(game => [game.id, game.title])) };

/**
 * A game's type as a round badge in its colour with its icon, at the start of a row:
 * the type is seen at a glance, before the words are read.
 */
const GameTypeIcon = ({ type }) => {
    const Icon = ICONS[type] ?? FaBullseye;
    return (
        <span className={`game-type-icon game-type-${type}`} title={LABELS[type] ?? type} aria-hidden="true">
            <Icon />
        </span>
    );
};

export default GameTypeIcon;
