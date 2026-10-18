import { Avatar } from 'primereact/avatar';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

/**
 * The setup of a running training in one line: who plays, the mode and how it
 * is scored. It stands in for the player choice and the settings until the
 * training is over.
 */
const ATCTrainingSummary = ({ players, mode, scoring }) => (
    <div className="atc-summary">
        {/* several players have their cards in the round right below */}
        {players.length === 1 && <span className="atc-summary-avatars">
            {players.map(player => (
                <Avatar
                    key={player.id}
                    image={resolvePlayerImg(player.profileImg)}
                    label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                    shape="circle"
                    className="avatar-sm"
                />
            ))}
        </span>}
        <span className="atc-summary-text">
            <span className="atc-summary-names">{players.map(player => player.nickname).join(', ')}</span>
            <span className="atc-summary-detail">{mode} · {scoring === 'Darts' ? 'fewest darts' : 'against the clock'}</span>
        </span>
    </div>
);

export default ATCTrainingSummary;
