import { BounceLoader } from 'react-spinners';
import { t } from '../../utils/i18n';

const PageLoader = () => {

    return (
        // padding, not margins: a margin would push the page's dark filter down and the page wider than the window
        <div className="container-fluid py-5">
            <div className="d-flex justify-content-center align-items-center">
                <span className="display-2 me-2 fw-semibold text-default">{t('L')}</span>
                <BounceLoader
                    color="#528b6e"
                    size="60px"
                />
                <span className="display-2 ms-2 fw-semibold text-default">{t('ading')}</span>
            </div>
        </div>
    )
}

export default PageLoader;