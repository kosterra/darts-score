import X01State from '../../../utils/x01.state';
import X01Game from './x01.game';

// training: a training against the bot, played like a game
const X01GamePage = ({ training = false }) => {

  return (
    <div className="container-fluid bg-transparent border-0 x01-game-page">
      {/* no Bootstrap row: its negative margin made the page wider than a phone */}
      <X01State training={training}>
        <X01Game />
      </X01State>
    </div>
  )
}

export default X01GamePage;
