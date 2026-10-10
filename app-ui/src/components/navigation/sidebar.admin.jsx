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
    FaUserPen
} from "react-icons/fa6";

const SidebarAdmin = (props) => {
    const { collapsed } = props;

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
                <MenuItem icon={<FaUserPen className="fs-6" />} component={<Link to="/admin/players" />} className="fs-8 fw-semibold">
                    Players
                </MenuItem>
                <SubMenu
                    label="Games"
                    icon={<GiDart className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/admin/games/x01" />} className="fs-8 fw-semibold"> X01</MenuItem>
                    <MenuItem component={<Link to="/admin/games/cricket" />} className="fs-8 fw-semibold"> Cricket</MenuItem>
                    <MenuItem component={<Link to="/admin/games/elimination" />} className="fs-8 fw-semibold"> Elimination</MenuItem>
                </SubMenu>
                <SubMenu
                    label="Training"
                    icon={<BsPersonFillCheck className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/admin/training/atc" />} className="fs-8 fw-semibold"> Around the Clock</MenuItem>
                </SubMenu>
            </Menu>
        </Fragment>
    );
};

export default SidebarAdmin;