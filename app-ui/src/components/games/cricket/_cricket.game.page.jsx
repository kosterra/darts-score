import CricketState from '../../../utils/cricket.state';
import CricketGame from './cricket.game';

const CricketGamePage = () => {

  return (
    <div className="container-fluid bg-transparent border-0 x01-game-page">
      {/* the same frame as X01, without a Bootstrap row: its negative margin made the page wider than a phone */}
      <CricketState>
        <CricketGame />
      </CricketState>
    </div>
  )
}

export default CricketGamePage;
