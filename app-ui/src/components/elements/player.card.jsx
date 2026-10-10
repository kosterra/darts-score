import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { resolvePlayerImg } from '../../utils/image.utils';

const PlayerCard = (props) => {
    const {
        player
    } = props

    return (
        <div className="container p-0">
            <Panel header={player ? player.nickname : 'Select a Player'} className="panel-brighter-bg">
                <div className="d-flex flex-column justify-content-center align-items-center">
                    <Avatar
                        label={player ? (player.firstname + ' ' + player.lastname).split(" ").map((n) => n[0]).join("") : 'N/A'}
                        image={player ? resolvePlayerImg(player.profileImg) : ''}
                        shape="circle"
                        size="xlarge"
                        style={{ width: '6rem', height: '6rem' }}
                    />
                    <span className="mt-3 text-center text-shade500 fw-semibold">
                        {player ? player.firstname + ' ' + player.lastname : 'No Player selected'}
                    </span>
                </div>
            </Panel>
        </div>
    );
}

export default PlayerCard;