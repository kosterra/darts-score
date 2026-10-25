import { Link } from 'react-router-dom';
import { useQuickPlaying } from './quick.frame';
import { t } from '../../utils/i18n';

/**
 * In a quick game being played, which has no bar on top: the logo at the
 * start of the game's header, back to the start page. Elsewhere nothing.
 */
const QuickHeroBrand = () => useQuickPlaying() && (
    <Link to="/" className="quick-hero-brand" aria-label={t('Legmate start page')} title={t('Legmate start page')}>
        <img alt="" src="/logo.svg" width="32" height="32" />
    </Link>
);

export default QuickHeroBrand;
