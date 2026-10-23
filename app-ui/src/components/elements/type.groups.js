import { FaBullseye, FaRobot } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { PiClockClockwiseBold, PiClockCountdownBold } from 'react-icons/pi';

import { GAMES } from '../../rules/games';
import { TRAININGS } from '../../rules/trainings';
import { rulesIcon } from '../rules/rules.icons';
import { t } from '../../utils/i18n';

// the types of the lists, grouped for their filter (see type.filter.jsx)
export const GAME_TYPE_GROUPS = [
    {
        label: t('Classic'),
        items: [
            { value: 'x01', label: t('X01'), icon: FaBullseye },
            { value: 'cricket', label: t('Cricket'), icon: MdSportsCricket },
            { value: 'elimination', label: t('Elimination'), icon: BiTargetLock },
            { value: 'clock', label: t('Around the Clock'), icon: PiClockClockwiseBold },
        ],
    },
    { label: t('More games'), items: GAMES.map(game => ({ value: game.id, label: game.title, icon: rulesIcon(game.id) })) },
];

export const TRAINING_TYPE_GROUPS = [
    {
        label: t('Classic'),
        items: [
            { value: 'atc', label: t('Around the Clock'), icon: PiClockCountdownBold },
            { value: 'x01', label: t('X01 against the bot'), icon: FaRobot },
        ],
    },
    { label: t('More trainings'), items: TRAININGS.map(training => ({ value: training.id, label: training.title, icon: rulesIcon(training.id) })) },
];

/**
 * The types chosen, from the address: "all" (or nothing) is every type, else
 * a list "x01,cricket"; "rules" (from before) is every game of the second group.
 */
export const typesFrom = (text, groups) => {
    if (!text || text === 'all') return [];
    return [...new Set(String(text).split(',').flatMap(type => (type === 'rules' ? groups[1].items.map(item => item.value) : [type])))]
        .filter(type => groups.some(group => group.items.some(item => item.value === type)));
};

// the types for the address
export const typesText = (types) => (types.length ? types.join(',') : 'all');
