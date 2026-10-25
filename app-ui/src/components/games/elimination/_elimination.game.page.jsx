import EliminationState from '../../../utils/elimination.state';
import EliminationGame from './elimination.game';

// quick: a quick game of the start page or of a darts evening
const EliminationGamePage = ({ quick = false }) => {
  return (
    <div className="container-fluid bg-transparent border-0 x01-game-page">
      {/* the same frame as X01, without a Bootstrap row: its negative margin made the page wider than a phone */}
      <EliminationState quick={quick}>
        <EliminationGame />
      </EliminationState>
    </div>
  );
};

export default EliminationGamePage;
