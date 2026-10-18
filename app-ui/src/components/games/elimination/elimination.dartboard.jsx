import { useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

import DartBoard from '../common/dartboard';
import EliminationContext from '../../../utils/elimination.context';
import useDartMarkers from '../common/use.dart.markers';

/**
 * The board of Elimination: each dart tapped is marked until the visit is
 * entered; no dart fits once the visit is over.
 */
const EliminationDartBoard = () => {
    const { game, getCurrentThrowScore, checkCanThrowMoreDarts, updateCurrentThrowDartBoard } = useContext(EliminationContext);
    const toast = useRef(null);
    const { markers, remember } = useDartMarkers(game.currentThrow, `${(game.allThrows ?? []).length}-${game.currentPlayerTurn}`);

    const setDartValue = (value, point) => {
        const score = game.playerModels[game.currentPlayerTurn].score + getCurrentThrowScore();
        if (!checkCanThrowMoreDarts(score)) {
            toast.current?.clear();
            toast.current?.show({ severity: 'error', summary: 'No more darts', detail: 'This visit is complete: enter the score.', life: 2500 });
            return;
        }
        remember(value, point);
        updateCurrentThrowDartBoard(score, value);
    };

    return (
        <>
            <DartBoard handleClick={setDartValue} markers={markers} />
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default EliminationDartBoard;
