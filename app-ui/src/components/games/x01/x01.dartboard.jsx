import { useContext, useEffect, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';

import DartBoard from '../common/dartboard';
import X01Context from '../../../utils/x01.context';
import { BOT_ID } from '../../../utils/x01.bot';
import { pointForDart, seededRandom } from '../../../utils/dartboard.geometry';
import useBoardDarts from '../common/use.board.darts';

const X01DartBoard = () => {
  const {
    game,
    players,
    updateCurrentThrowDartBoard,
    getCurrentThrowScore,
    checkCanThrowMoreDarts,
    botThrowing
  } = useContext(X01Context);

  const toast = useRef(null);
  // where each dart of the visit was tapped, by its place in the visit: { x, y, dart }
  const [taps, setTaps] = useState([]);
  // a new visit starts without marks
  const visitKey = `${game.currentSet}-${game.currentSetLeg}-${game.currentLegThrows.length}-${game.currentPlayerTurn}`;
  useEffect(() => setTaps([]), [visitKey]);
  // a dart cleared or typed over: its mark goes
  // (a dart that does not count before the double in is stored as 0, its mark stays)
  const tapped = game.currentThrow.map((dart, index) => taps[index] && (taps[index].dart === dart || dart === '0') ? taps[index] : null);
  // the bot taps nothing: its darts stick somewhere in the field they hit, the same spot on every redraw
  const markers = game.currentPlayerTurn === BOT_ID
    ? game.currentThrow.map((dart, index) => dart ? { ...pointForDart(dart, seededRandom(`${visitKey}-${index}-${dart}`)), dart } : null)
    : tapped;
  const { withDarts, flight } = useBoardDarts(game, players);

  const setDartValue = (value, point) => {
    // in a training the bot throws its own darts
    if (botThrowing) return;
    let totalScore = getCurrentThrowScore();
    let currentPlayerScore = game.playerModels[game.currentPlayerTurn].score;

    let newCurrentScore = currentPlayerScore - totalScore;

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

    // the dart goes into the first empty place of the visit
    const slot = game.currentThrow.findIndex(dart => dart.trim() === '');
    if (point) setTaps(Object.assign([...tapped], { [slot]: { ...point, dart: value } }));
    updateCurrentThrowDartBoard(newCurrentScore, value);
  }

  return (
    <>
      <DartBoard handleClick={setDartValue} markers={markers} withDarts={withDarts} flight={flight} />
      <Toast ref={toast} position="bottom-right" />
    </>
  )
}

export default X01DartBoard
