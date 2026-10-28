import { Fragment } from 'react';

import { t } from '../../utils/i18n';
import { ShirtPicture } from '../shirts/shirt.art';

// the walk-on: both players in their shirts, as on the stage, before a match is played
const WalkOn = ({ tournament, match, club }) => (
    <div className="tournament-walk-on" aria-hidden="true">
        {match.players.map((id, index) => {
            const player = tournament.players?.[id];
            return (
                <Fragment key={id ?? index}>
                    {index === 1 && <span className="tournament-walk-on-vs">{t('vs')}</span>}
                    <span className="tournament-walk-on-player">
                        {player?.shirt && <ShirtPicture {...player.shirt} nickname={player.nickname} club={club} uid={`walk-on-${match.id}-${index}`} />}
                        <span className="text-default fw-semibold fs-7 text-truncate">{player?.nickname ?? '?'}</span>
                    </span>
                </Fragment>
            );
        })}
    </div>
);

export default WalkOn;
