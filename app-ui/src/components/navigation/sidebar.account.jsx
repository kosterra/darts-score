import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPeopleGroup, FaCircleUser, FaRightFromBracket } from "react-icons/fa6";
import { Menu, MenuItem, SubMenu } from 'react-pro-sidebar';

import { useAuth } from '../../utils/auth.context';

const SidebarAccount = (props) => {
    const { collapsed } = props;
    const navigate = useNavigate();
    const { user, clubs, activeClub, selectClub, logout } = useAuth();

    const onSelectClub = (club) => {
        selectClub(club.id);
        navigate('/');
    };

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            {!collapsed &&
                <div className="menu-subtitle fw-semibold fs-8 ps-4 py-2 pt-4">
                    Account
                </div>
            }
            <Menu>
                <SubMenu
                    label={activeClub ? activeClub.name : 'No club'}
                    icon={<FaPeopleGroup className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    {clubs.filter(club => club.id !== activeClub?.id).map(club => (
                        <MenuItem key={club.id} onClick={() => onSelectClub(club)} className="fs-8 fw-semibold"> {club.name}</MenuItem>
                    ))}
                    <MenuItem component={<Link to="/clubs" />} className="fs-8 fw-semibold"> Manage clubs</MenuItem>
                </SubMenu>
                <MenuItem icon={<FaCircleUser className="fs-6" />} component={<Link to="/profile" />} className="fs-8 fw-semibold">
                    {user.firstname} {user.lastname}
                </MenuItem>
                <MenuItem icon={<FaRightFromBracket className="fs-6" />} onClick={logout} className="fs-8 fw-semibold">
                    Log out
                </MenuItem>
            </Menu>
        </Fragment>
    );
};

export default SidebarAccount;
