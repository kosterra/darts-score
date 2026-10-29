import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import HallOfShame from '../../badges/hall.of.shame';
import { useClubShame } from '../../badges/hall.of.shame.data';
import { t } from '../../../utils/i18n';

/**
 * The Hall of Shame on the dashboard: who holds Bed and Breakfast, Madhouse
 * and the others right now (those nobody holds are on the badges page).
 * Nothing when the club switched it off.
 */
const HallOfShameWidget = ({ widget }) => {
    const shame = useClubShame();
    if (shame && !shame.enabled) return null;
    return (
        <Panel header={widget.title} className="h-100">
            <HallOfShame shame={shame} heldOnly />
            {shame && <Link to="/badges#shame" className="d-inline-block mt-3 fs-7">{t('The whole Hall of Shame')}</Link>}
        </Panel>
    );
};

export default HallOfShameWidget;
