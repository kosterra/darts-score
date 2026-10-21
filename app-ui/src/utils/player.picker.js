
import { t } from './i18n';// Choosing the players of a game: who is offered first and the order they throw in.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

const DAY = 24 * 60 * 60 * 1000;

const matches = (player, search) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [player.nickname, player.firstname, player.lastname, `${player.firstname} ${player.lastname}`]
        .some(text => text?.toLowerCase().includes(term));
};

/**
 * The players matching the search, those who played most recently first,
 * the others by nickname.
 */
export const offeredPlayers = (players, lastPlayed = {}, search = '') => players
    .filter(player => matches(player, search))
    .sort((a, b) => {
        const playedA = lastPlayed[a.id] ? new Date(lastPlayed[a.id]).getTime() : 0;
        const playedB = lastPlayed[b.id] ? new Date(lastPlayed[b.id]).getTime() : 0;
        return playedB - playedA || String(a.nickname).localeCompare(String(b.nickname));
    });

// e.g. "today", "yesterday", "5 days ago"; null when never or long ago
export const playedWhen = (date, now = new Date()) => {
    if (!date) return null;
    const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const days = Math.round((startOfDay(now) - startOfDay(new Date(date))) / DAY);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return t('{{days}} days ago', { days: days });
    return null;
};

// the list with the item at "from" moved to "to"
export const moveItem = (list, from, to) => {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const moved = [...list];
    const [item] = moved.splice(from, 1);
    moved.splice(to, 0, item);
    return moved;
};

export const shuffled = (list, random = Math.random) => {
    const result = [...list];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
};

// the player who won the bull-off throws first, the others keep their order
export const withStarter = (list, playerId) => {
    const starter = list.find(player => player.id === playerId);
    return starter ? [starter, ...list.filter(player => player.id !== playerId)] : list;
};

// a tapped card joins the game at the end, or leaves it; never more than the maximum
export const toggled = (selected, player, max = MAX_PLAYERS) => {
    if (selected.some(chosen => chosen.id === player.id)) return selected.filter(chosen => chosen.id !== player.id);
    return selected.length < max ? [...selected, player] : selected;
};
