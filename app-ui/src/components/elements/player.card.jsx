import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { resolvePlayerImg } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

const PlayerCard = (props) => {
    const {
        player
    } = props

    return (
        <div className="container p-0">
            <Panel header={player ? player.nickname : t('Select a Player')} className="panel-brighter-bg">
                <div className="d-flex flex-column justify-content-center align-items-center">
                    <Avatar
                        label={player ? (player.firstname + ' ' + player.lastname).split(" ").map((n) => n[0]).join("") : t('N/A')}
                        image={player ? resolvePlayerImg(player.profileImg) : ''}
                        shape="circle"
                        className="avatar-lg"
                    />
                    <span className="mt-3 text-center text-faint fw-semibold">
                        {player ? player.firstname + ' ' + player.lastname : t('No Player selected')}
                    </span>
                </div>
            </Panel>
        </div>
    );
}

export default PlayerCard;