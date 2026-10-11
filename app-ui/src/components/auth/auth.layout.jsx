import { Panel } from 'primereact/panel';

/**
 * Centered card used by the login and register pages.
 */
const AuthLayout = ({ title, children }) => {
    return (
        <div className="container-fluid p-4">
            <div className="row justify-content-center">
                <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
                    <div className="d-flex flex-column align-items-center gap-2 my-4">
                        <img alt="darts score logo" src="/logo.svg" width="96" height="96" />
                        <span className="fs-4 fw-semibold text-default">Darts Score</span>
                    </div>
                    <Panel header={title}>
                        {children}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
