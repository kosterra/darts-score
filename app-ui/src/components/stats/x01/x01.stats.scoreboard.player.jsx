import { Fragment } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaTrophy } from "react-icons/fa6";
import { resolvePlayerImg } from '../../../utils/image.utils';

const X01StatsScoreBoardPlayer = ({ player = {}, hasWonGame = false }) => {
    const { firstname = '', lastname = '', nickname = 'N/A', profileImg = '' } = player;
    const initials = `${firstname} ${lastname}`.split(' ').map(n => n[0]).join('');

    return (
        <Fragment>
            <div className="d-flex flex-column justify-content-center align-items-center">
                <div className="position-relative">
                    <Avatar
                        label={initials}
                        image={resolvePlayerImg(profileImg)}
                        shape="circle"
                        className="avatar-lg bg-shade700 mx-3"
                    />
                    {hasWonGame && (
                        <span className="position-absolute top-80 start-85 translate-middle">
                            <FaTrophy className="display-5 text-gold mt-2" />
                        </span>
                    )}
                </div>
                <div className="mt-2 text-shade100 fs-6 fw-semibold">{nickname}</div>
                <div className="text-shade500 fs-7 fw-semibold">{firstname} {lastname}</div>
            </div>
        </Fragment>
    );
};

export default X01StatsScoreBoardPlayer;
