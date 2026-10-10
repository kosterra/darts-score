import X01State from '../../../utils/x01.state';
import X01Game from './x01.game';

const X01GamePage = () => {

  return (
    <div className="container-fluid p-4 pt-0 bg-transparent border-0">
      <div className="row justify-content-md-center align-items-center">
        <X01State>
          <X01Game />
        </X01State>
      </div>
    </div>
  )
}

export default X01GamePage;
