import X01State from '../../../utils/x01.state';
import X01Game from './x01.game';

// training: a training against the bot, played like a game; quick: a quick game of the start page
const X01GamePage = ({ training = false, quick = false }) => {

  return (
    <div className="container-fluid bg-transparent border-0 x01-game-page">
      {/* no Bootstrap row: its negative margin made the page wider than a phone */}
      <X01State training={training} quick={quick}>
        <X01Game />
      </X01State>
    </div>
  )
}

export default X01GamePage;
