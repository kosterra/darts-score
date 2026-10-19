import { Panel } from 'primereact/panel';

import HallOfShame from '../../badges/hall.of.shame';
import { useClubShame } from '../../badges/hall.of.shame.data';

/**
 * The Hall of Shame on the dashboard: who holds Bed and Breakfast, Madhouse
 * and the others right now. Nothing when the club switched it off.
 */
const HallOfShameWidget = ({ widget }) => {
    const shame = useClubShame();
    if (shame && !shame.enabled) return null;
    return (
        <Panel header={widget.title} className="h-100">
            <HallOfShame shame={shame} />
        </Panel>
    );
};

export default HallOfShameWidget;
