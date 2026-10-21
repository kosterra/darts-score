import CricketState from '../../../utils/cricket.state';
import CricketGame from './cricket.game';

// quick: a quick game of the start page
const CricketGamePage = ({ quick = false }) => {

  return (
    <div className="container-fluid bg-transparent border-0 x01-game-page">
      {/* the same frame as X01, without a Bootstrap row: its negative margin made the page wider than a phone */}
      <CricketState quick={quick}>
        <CricketGame />
      </CricketState>
    </div>
  )
}

export default CricketGamePage;
