import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import QuickLayout from './quick.layout';
import { QuickPlaying } from './quick.frame';
import { PublicFooter } from '../landing/public.frame';

const X01GamePage = lazy(() => import('../games/x01/_x01.game.page'));
const CricketGamePage = lazy(() => import('../games/cricket/_cricket.game.page'));
const X01GameStats = lazy(() => import('../stats/x01/x01.game.stats'));
const CricketGameStats = lazy(() => import('../stats/cricket/cricket.game.stats'));

/**
 * A quick game, or its statistics (stats), in the frame of the quick games:
 * the pages of the club games in their quick mode. While it is played the
 * bar on top is left out, so the board has the room; the game's own header
 * leads back to the start page instead; the footer stays below the game.
 */
const QuickGamePage = ({ stats = false }) => {
    const { kind } = useParams();
    const pages = stats
        ? { x01: <X01GameStats quick />, cricket: <CricketGameStats quick /> }
        : { x01: <X01GamePage quick />, cricket: <CricketGamePage quick /> };
    if (!pages[kind]) return <Navigate replace to="/quick" />;
    if (stats) return <QuickLayout>{pages[kind]}</QuickLayout>;
    return (
        <QuickPlaying.Provider value={true}>
            <div className="quick-page is-playing">
                <div className="quick-page-content">{pages[kind]}</div>
                <PublicFooter />
            </div>
        </QuickPlaying.Provider>
    );
};

export default QuickGamePage;
