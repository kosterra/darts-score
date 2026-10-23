import { Panel } from 'primereact/panel';
import { PublicFooter, PublicHeader } from '../landing/public.frame';

/**
 * The frame of the login, registration and password pages: the bar and the
 * footer of the start page (the language on the right), and the card in the
 * middle. hide: 'login' or 'register', the page itself, left out of the bar.
 */
const AuthLayout = ({ title, hide, children }) => {
    return (
        <div className="auth-page">
            <PublicHeader hide={hide} />
            <main className="auth-page-content container-fluid p-4">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
                        <div className="d-flex justify-content-center mb-4">
                            <img alt="" src="/logo.svg" width="96" height="96" />
                        </div>
                        <Panel header={title}>
                            {children}
                        </Panel>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
};

export default AuthLayout;
