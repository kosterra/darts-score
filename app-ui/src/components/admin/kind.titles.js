import { gameOf } from '../../rules/games';
import { trainingOf } from '../../rules/trainings';
import { t } from '../../utils/i18n';

const GAME_NAMES = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock' };

// a type of game: its name (the icon is the type itself, see game.type.icon)
export const gameTitle = (type) => (GAME_NAMES[type] ? t(GAME_NAMES[type]) : gameOf(type)?.title ?? type);

// a kind of training: its name and the icon of its badge
export const trainingTitle = (kind) => (kind === 'atc' ? t('Around the Clock') : kind === 'x01' ? t('X01 against the bot') : trainingOf(kind)?.title ?? kind);
export const trainingIcon = (kind) => (kind === 'atc' ? 'atc' : kind === 'x01' ? 'bot' : kind);
