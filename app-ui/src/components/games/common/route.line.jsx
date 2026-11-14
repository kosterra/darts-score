import { formatRoute } from '../../../utils/checkout.routes';
import { t } from '../../../utils/i18n';

/**
 * The way out in the header (inside .x01-live-route): the usual way, then on a phone, where the
 * list of the ways is below the board, one or two other ways, smaller and quieter. Only whole ways
 * show: one that does not fit on the line drops out.
 */
const RouteLine = ({ routes, others = 2 }) => (
    <>
        <span className="x01-route-main">{formatRoute(routes[0])}</span>
        {routes.length > 1 && others > 0 &&
            <span className="x01-route-others" aria-label={t('Other ways')}>
                {routes.slice(1, 1 + others).map(route => <span key={route.join()} className="x01-route-other">{formatRoute(route)}</span>)}
            </span>}
    </>
);

export default RouteLine;
