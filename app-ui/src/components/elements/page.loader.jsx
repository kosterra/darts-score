import { BounceLoader } from 'react-spinners';

const PageLoader = () => {

    return (
        <div className="container-fluid m-5">
            <div className="d-flex justify-content-center align-items-center">
                <span className="display-2 me-2 fw-semibold text-shade100">L</span>
                <BounceLoader
                    color="#528b6e"
                    size="60px"
                />
                <span className="display-2 ms-2 fw-semibold text-shade100">ading</span>
            </div>
        </div>
    )
}

export default PageLoader;