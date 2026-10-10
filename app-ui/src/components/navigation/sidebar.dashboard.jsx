import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MdDashboard } from "react-icons/md";

import {
    Menu,
    MenuItem
} from 'react-pro-sidebar';


const SidebarDashboard = (props) => {
    const { collapsed } = props;

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            <Menu>
                <MenuItem icon={<MdDashboard className="fs-6" />} component={<Link to="/" />} className="fs-8 fw-semibold">
                    Dashboard
                </MenuItem>
            </Menu>
        </Fragment>
    );
};

export default SidebarDashboard;