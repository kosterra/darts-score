import { useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

import DartBoard from '../common/dartboard';
import EliminationContext from '../../../utils/elimination.context';
import useDartMarkers from '../common/use.dart.markers';
import useBoardDarts from '../common/use.board.darts';
import { t } from '../../../utils/i18n';

/**
 * The board of Elimination: each dart tapped is marked until the visit is
 * entered, with a dart flying to it unless the game or the player switched
 * the animation off; no dart fits once the visit is over.
 */
const EliminationDartBoard = () => {
    const { game, players, getCurrentThrowScore, checkCanThrowMoreDarts, updateCurrentThrowDartBoard } = useContext(EliminationContext);
    const { withDarts, flight } = useBoardDarts(game, players);
    const toast = useRef(null);
    const { markers, remember } = useDartMarkers(game.currentThrow, `${(game.allThrows ?? []).length}-${game.currentPlayerTurn}`);

    const setDartValue = (value, point) => {
        const score = game.playerModels[game.currentPlayerTurn].score + getCurrentThrowScore();
        if (!checkCanThrowMoreDarts(score)) {
            toast.current?.clear();
            toast.current?.show({ severity: 'error', summary: t('No more darts'), detail: t('This visit is complete: enter the score.'), life: 2500 });
            return;
        }
        remember(value, point);
        updateCurrentThrowDartBoard(score, value);
    };

    return (
        <>
            <DartBoard handleClick={setDartValue} markers={markers} withDarts={withDarts} flight={flight} />
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default EliminationDartBoard;
