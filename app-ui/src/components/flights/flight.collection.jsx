import { useEffect, useId, useState } from 'react';
import { Panel } from 'primereact/panel';
import { ProgressBar } from 'primereact/progressbar';

import PlayerService from '../../services/player.service';
import { FlightPicture } from './flight.art';
import { BarrelPicture } from './barrel.art';

const GROUPS = [
    { key: 'shapes', title: 'Flight shapes' },
    { key: 'designs', title: 'Flight designs' },
    { key: 'barrels', title: 'Barrels' },
];

/**
 * What a player has collected of the flight shapes, designs and barrels, next
 * to their badges: the owned ones as small pictures, with how many there are.
 * Each one is shown on its own (a design on the standard shape in its own
 * colours, a shape plain), as in a collector's album.
 */
const FlightCollection = ({ playerId }) => {
    const uid = `collection-${useId().replace(/:/g, '')}`;
    const [standing, setStanding] = useState(null);

    useEffect(() => {
        let current = true;
        setStanding(null);
        PlayerService.loadFlights(playerId).then(loaded => { if (current) setStanding(loaded); }).catch(() => {});
        return () => { current = false; };
    }, [playerId]);

    if (!standing) return null;
    const all = GROUPS.flatMap(group => standing[group.key]);
    const owned = all.filter(item => item.state === 'owned').length;

    const picture = (group, item) => {
        const id = `${uid}-${group}-${item.id}`;
        if (group === 'barrels') return <BarrelPicture barrel={item.id} uid={id} />;
        if (group === 'shapes') return <FlightPicture shape={item.id} design="plain" color="#7d8791" uid={id} />;
        return <FlightPicture shape="standard" design={item.id} color="#46a758" uid={id} />;
    };

    return (
        <section className="d-flex flex-column gap-3">
            <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                <h2 className="fs-4 fw-semibold text-default m-0">Flights and barrels</h2>
                <span className="text-subtle">{owned} of {all.length} collected</span>
                <ProgressBar value={Math.round(owned / all.length * 100)} showValue={false} style={{ height: '0.5rem', width: '16rem', maxWidth: '100%' }} />
            </div>
            <Panel header={`${standing.points.balance} flight points to spend · ${standing.points.earned} earned`}>
                <div className="d-flex flex-column gap-3">
                    {GROUPS.map(group => {
                        const items = standing[group.key].filter(item => item.state === 'owned');
                        return (
                            <div key={group.key} className="d-flex flex-column gap-2">
                                <span className="text-subtle fs-8">{group.title} · {items.length} of {standing[group.key].length}</span>
                                <ul className="flight-album list-unstyled m-0">
                                    {items.map(item => (
                                        <li key={item.id} className={`flight-album-item is-${item.rarity}`} title={item.label}>
                                            {picture(group.key, item)}
                                            <span>{item.label}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </Panel>
        </section>
    );
};

export default FlightCollection;
