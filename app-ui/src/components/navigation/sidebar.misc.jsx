import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { FaCircleQuestion } from "react-icons/fa6";
import { Menu, MenuItem } from 'react-pro-sidebar';

const SidebarMisc = () => {

    return (
        <Fragment>
            <hr className="menu-divider my-1" />
            <Menu>
                <MenuItem icon={<FaCircleQuestion className="fs-6" />} component={<Link to="/about" />} className="fs-8 fw-semibold">
                    About
                </MenuItem>
            </Menu>
        </Fragment>
    );
};

export default SidebarMisc;