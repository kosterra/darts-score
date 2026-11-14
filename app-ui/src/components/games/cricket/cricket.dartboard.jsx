import { useContext } from 'react';

import DartBoard from '../common/dartboard';
import CricketContext from '../../../utils/cricket.context';
import useDartMarkers from '../common/use.dart.markers';
import useBoardDarts from '../common/use.board.darts';

/**
 * The board of Cricket: each dart tapped is marked until the visit is
 * entered, with a dart flying to it unless the game or the player switched
 * the animation off.
 */
const CricketDartBoard = () => {
    const { game, players, updateCurrentThrowDartBoard } = useContext(CricketContext);
    const { withDarts, flight } = useBoardDarts(game, players);
    const { markers, remember } = useDartMarkers(game.currentThrow, `${game.allThrows.length}-${game.currentPlayerTurn}`);

    // three darts in: a fourth tapped says the visit is complete
    const canThrow = game.currentThrow.some(dart => dart.trim() === '');
    const handleDartClick = (value, point) => {
        if (!canThrow) return;
        remember(value, point);
        updateCurrentThrowDartBoard(value);
    };

    return <DartBoard handleClick={handleDartClick} canThrow={canThrow} markers={markers} withDarts={withDarts} flight={flight} />;
};

export default CricketDartBoard;
