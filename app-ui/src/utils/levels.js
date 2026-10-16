import { FaSeedling, FaBeerMugEmpty, FaUsers, FaListOl, FaFlag, FaMedal, FaEarthEurope, FaCrown } from 'react-icons/fa6';

/**
 * How each player level looks: an icon and a colour that warms up from grey
 * to gold the higher the level. The rules themselves live on the server.
 */
export const LEVEL_STYLES = {
    rookie: { icon: FaSeedling, color: '#a3a3a3' },
    pubPlayer: { icon: FaBeerMugEmpty, color: '#b5c9a8' },
    clubRegular: { icon: FaUsers, color: '#8fc3a6' },
    leaguePlayer: { icon: FaListOl, color: '#7ecca5' },
    countyPlayer: { icon: FaFlag, color: '#8fc3df' },
    pro: { icon: FaMedal, color: '#c3a9e6' },
    worldClass: { icon: FaEarthEurope, color: '#e8b98a' },
    legend: { icon: FaCrown, color: '#ffc94d' },
};

