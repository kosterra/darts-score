import { useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';
import DartBoard from '../common/dartboard';
import EliminationContext from '../../../utils/elimination.context';

const EliminationDartBoard = () => {
  const {
    game,
    getCurrentThrowScore,
    checkCanThrowMoreDarts,
    updateCurrentThrowDartBoard
  } = useContext(EliminationContext);

  const toast = useRef(null);

  const setDartValue = (value) => {
    let totalScore = getCurrentThrowScore();
    let currentPlayerScore = game.playerModels[game.currentPlayerTurn].score;

    let newCurrentScore = currentPlayerScore + totalScore;

    if (!checkCanThrowMoreDarts(newCurrentScore)) {
      toast.current.show(
        {
          severity: 'error',
          summary: 'No more darts',
          detail: 'You can\'t throw any more darts',
          life: 3000
        }
      );
      return
    }

    updateCurrentThrowDartBoard(newCurrentScore, value);
  }

  return (
    <>
      <DartBoard
        handleClick={setDartValue}
      />
      <Toast ref={toast} position="bottom-right" />
    </>
  );
};

export default EliminationDartBoard;
