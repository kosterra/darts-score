import { useContext } from 'react';
import DartBoard from '../common/dartboard';
import CricketContext from '../../../utils/cricket.context';

const CricketDartBoard = () => {
  const { updateCurrentThrowDartBoard } = useContext(CricketContext);

  const handleDartClick = (value) => {
    updateCurrentThrowDartBoard(value);
  }

  return <DartBoard handleClick={handleDartClick} />;
}

export default CricketDartBoard;
