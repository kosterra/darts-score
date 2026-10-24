import { FaSeedling, FaBeerMugEmpty, FaUsers, FaListOl, FaFlag, FaMedal, FaEarthEurope, FaCrown } from 'react-icons/fa6';
import { ACCENT, readable } from './palette';

/**
 * How each player level looks: an icon and a colour that warms up from grey
 * to gold the higher the level (darker on the light theme). The rules
 * themselves live on the server.
 */
export const LEVEL_STYLES = {
    rookie: { icon: FaSeedling, get color() { return readable('#a3a3a3'); } },
    pubPlayer: { icon: FaBeerMugEmpty, get color() { return readable('#b5c9a8'); } },
    clubRegular: { icon: FaUsers, get color() { return readable('#8fc3a6'); } },
    leaguePlayer: { icon: FaListOl, get color() { return ACCENT.green; } },
    countyPlayer: { icon: FaFlag, get color() { return readable('#8fc3df'); } },
    pro: { icon: FaMedal, get color() { return readable('#c3a9e6'); } },
    worldClass: { icon: FaEarthEurope, get color() { return readable('#e8b98a'); } },
    legend: { icon: FaCrown, get color() { return ACCENT.gold; } },
};

