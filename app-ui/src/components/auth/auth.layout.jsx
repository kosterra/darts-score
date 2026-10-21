import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { t } from '../../utils/i18n';
import LanguageSwitch from '../elements/language.switch';

/**
 * Centered card used by the login and register pages.
 */
const AuthLayout = ({ title, children }) => {
    return (
        <div className="container-fluid p-4">
            <div className="row justify-content-center">
                <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
                    <div className="d-flex justify-content-end mt-2">
                        <LanguageSwitch />
                    </div>
                    <Link to="/" className="d-flex flex-column align-items-center gap-2 mb-4" aria-label={t('Oche start page')}>
                        <img alt="" src="/logo.svg" width="96" height="96" />
                        <span className="fs-4 fw-semibold text-default">{t('Oche')}</span>
                    </Link>
                    <Panel header={title}>
                        {children}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
