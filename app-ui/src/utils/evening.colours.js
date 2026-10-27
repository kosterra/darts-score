import { PLAYER_COLORS } from '../components/stats/charts/chart.theme';
import { ACCENT, GAME_COLORS } from './palette';

// up to eight players in a darts evening: the four player colours, then accents of the app;
// each player keeps theirs on the whole page (the table, who beat whom, the form)
const eveningColours = () => [...PLAYER_COLORS, GAME_COLORS.elimination, ACCENT.pink, ACCENT.cream, ACCENT.amber];

export const colourOf = (players, playerId) => eveningColours()[Math.max(0, players.findIndex(player => player.id === playerId)) % 8];
