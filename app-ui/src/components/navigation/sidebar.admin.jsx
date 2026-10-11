import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { GiDart } from "react-icons/gi";
import { BsPersonFillCheck } from "react-icons/bs";

import {
    Menu,
    MenuItem,
    SubMenu
} from 'react-pro-sidebar';

import {
    FaUserPen,
    FaUsersGear
} from "react-icons/fa6";

import { useAuth } from '../../utils/auth.context';

const SidebarAdmin = (props) => {
    const { collapsed } = props;
    const { isGlobalAdmin, isClubAdmin } = useAuth();

    if (!isClubAdmin && !isGlobalAdmin) return null;

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            {!collapsed &&
                <div className="menu-subtitle fw-semibold fs-8 ps-4 py-2 pt-4">
                    Admin
                </div>
            }
            <Menu>
                {isClubAdmin &&
                <MenuItem icon={<FaUserPen className="fs-6" />} component={<Link to="/admin/players" />} className="fs-8 fw-semibold">
                    Players
                </MenuItem>
                }
                {isClubAdmin &&
                <SubMenu
                    label="Games"
                    icon={<GiDart className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/admin/games/x01" />} className="fs-8 fw-semibold"> X01</MenuItem>
                    <MenuItem component={<Link to="/admin/games/cricket" />} className="fs-8 fw-semibold"> Cricket</MenuItem>
                    <MenuItem component={<Link to="/admin/games/elimination" />} className="fs-8 fw-semibold"> Elimination</MenuItem>
                </SubMenu>
                }
                {isClubAdmin &&
                <SubMenu
                    label="Training"
                    icon={<BsPersonFillCheck className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/admin/training/atc" />} className="fs-8 fw-semibold"> Around the Clock</MenuItem>
                </SubMenu>
                }
                {isGlobalAdmin &&
                    <MenuItem icon={<FaUsersGear className="fs-6" />} component={<Link to="/admin/users" />} className="fs-8 fw-semibold">
                        Users
                    </MenuItem>
                }
            </Menu>
        </Fragment>
    );
};

export default SidebarAdmin;