import X01Models from '../models/x01.models';
import CricketModels from '../models/cricket.models';
import EliminationModels from '../models/elimination.models';
import { t } from './i18n';

/**
 * Quick games without an account: the games and setups on offer, and a new
 * game of them, as the quick game page and a darts evening start them.
 */

export const QUICK_GAMES = [{ label: t('X01'), value: 'x01' }, { label: t('Cricket'), value: 'cricket' }, { label: t('Elimination'), value: 'elimination' }];
export const QUICK_SCORES = [{ label: '301', value: 301 }, { label: '501', value: 501 }];
export const QUICK_OUTS = [{ label: t('Double Out'), value: 'Double Out' }, { label: t('Straight Out'), value: 'Straight Out' }];
export const QUICK_LEGS = [{ label: t('1 leg'), value: 1 }, { label: t('Best of 3'), value: 3 }, { label: t('Best of 5'), value: 5 }];
export const QUICK_VARIANTS = [{ label: t('Standard'), value: 'Standard' }, { label: t('Cut-throat'), value: 'Cut-throat' }];
export const QUICK_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '.-]{0,19}$/u;

// the settings a quick game starts with, unless the last one said otherwise
export const QUICK_DEFAULTS = { kind: 'x01', startingScore: 501, legOutMode: 'Double Out', numberOfLegs: 3, variant: 'Standard', targetScore: 301, gameOutMode: 'Double Out' };

// what a quick game is set up as, in a few words: "501 · Double Out · Best of 3", "Cricket · Standard"
export const quickSetupText = (kind, settings) => {
    if (kind === 'x01') return `${settings.startingScore} · ${t(settings.legOutMode)} · ${QUICK_LEGS.find(entry => entry.value === settings.numberOfLegs)?.label ?? ''}`;
    if (kind === 'elimination') return `${t('Elimination')} · ${settings.targetScore} · ${t(settings.gameOutMode)}`;
    return `${t('Cricket')} · ${t(settings.variant)}`;
};

/**
 * A new quick game: kind, its settings and the players [{ id, nickname }] in
 * the order they throw. → the game as the services create it
 */
export const newQuickGame = (kind, settings, players) => {
    const ids = players.map(player => player.id);
    const common = {
        isSoloGame: ids.length === 1,
        numberOfPlayers: ids.length,
        players: ids,
        quickPlayers: players.map(({ id, nickname }) => ({ id, nickname })),
        currentPlayerTurn: ids[0],
        flyingDarts: 'off',
    };
    if (kind === 'x01') {
        return {
            ...X01Models.X01GameModel,
            ...common,
            startingScore: settings.startingScore,
            legInMode: 'Straight In',
            legOutMode: settings.legOutMode,
            setMode: 'Best of',
            legMode: 'Best of',
            numberOfSets: 1,
            numberOfLegs: settings.numberOfLegs,
            startingPlayerSet: ids[0],
            startingPlayerLeg: ids[0],
            playerModels: Object.fromEntries(ids.map(id => [id, { ...X01Models.X01PlayerModel, score: settings.startingScore }])),
        };
    }
    if (kind === 'elimination') {
        return {
            ...EliminationModels.EliminationModel,
            ...common,
            targetScore: settings.targetScore,
            gameInMode: 'Straight In',
            gameOutMode: settings.gameOutMode,
            startingPlayer: ids[0],
            playerModels: Object.fromEntries(ids.map(id => [id, { ...EliminationModels.EliminationPlayerModel }])),
        };
    }
    return {
        ...CricketModels.CricketGameModel,
        ...common,
        variant: settings.variant,
        playerModels: Object.fromEntries(ids.map(id => [id, { ...CricketModels.CricketPlayerModel, score: Number(CricketModels.CricketGameModel.startingScore) }])),
    };
};
