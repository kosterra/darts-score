import CricketState from '../../../utils/cricket.state';
import CricketGame from './cricket.game';

const CricketGamePage = () => {

  return (
    <div className="container-fluid p-4 pt-0 bg-transparent border-0">
      <div className="row justify-content-md-center align-items-center">
        <CricketState>
          <CricketGame />
        </CricketState>
      </div>
    </div>
  )
}

export default CricketGamePage;