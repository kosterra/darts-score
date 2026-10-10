import EliminationState from '../../../utils/elimination.state';
import EliminationGame from './elimination.game';

const X01GamePage = () => {
  return (
    <div className="container-fluid p-4 pt-0 bg-transparent border-0">
      <div className="row justify-content-md-center align-items-center">
        <EliminationState>
          <EliminationGame />
        </EliminationState>
      </div>
    </div>
  );
};

export default X01GamePage;
