import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

/**
 * The setup of a running training in one line: who plays, the mode and how it
 * is scored. It stands in for the player choice and the settings while
 * training; onSettings (when nothing is running) goes back to them.
 */
const ATCTrainingSummary = ({ players, mode, scoring, onSettings }) => (
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
        {onSettings &&
            <Button type="button" label="Settings" icon="pi pi-sliders-h" size="small" severity="secondary" className="ms-auto flex-shrink-0" onClick={onSettings} aria-label="Change the player, the training or the mode" />
        }
    </div>
);

export default ATCTrainingSummary;
