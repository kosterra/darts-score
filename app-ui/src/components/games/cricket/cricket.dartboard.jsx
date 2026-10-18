import { useContext } from 'react';

import DartBoard from '../common/dartboard';
import CricketContext from '../../../utils/cricket.context';
import useDartMarkers from '../common/use.dart.markers';

/**
 * The board of Cricket: each dart tapped is marked until the visit is entered.
 */
const CricketDartBoard = () => {
    const { game, updateCurrentThrowDartBoard } = useContext(CricketContext);
    const { markers, remember } = useDartMarkers(game.currentThrow, `${game.allThrows.length}-${game.currentPlayerTurn}`);

    const handleDartClick = (value, point) => {
        if (!game.currentThrow.some(dart => dart.trim() === '')) return;
        remember(value, point);
        updateCurrentThrowDartBoard(value);
    };

    return <DartBoard handleClick={handleDartClick} markers={markers} />;
};

export default CricketDartBoard;
