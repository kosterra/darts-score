import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Menu, MenuItem } from 'react-pro-sidebar';
import { MdSportsCricket } from "react-icons/md";
import { FaBullseye } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";

const SidebarPlay = (props) => {
    const { collapsed } = props;

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            {!collapsed &&
                <div className="menu-subtitle fw-semibold fs-8 ps-4 py-2 pt-4">
                    {"Let's Play Darts"}
                </div>
            }
            <Menu>
                <MenuItem icon={<FaBullseye className="fs-6" />} component={<Link to="/x01" />} className="fs-8 fw-semibold">
                    X01
                </MenuItem>
                <MenuItem icon={<MdSportsCricket className="fs-6" />} component={<Link to="/cricket" />} className="fs-8 fw-semibold">
                    Cricket
                </MenuItem>
                <MenuItem icon={<BiTargetLock className="fs-6" />} component={<Link to="/elimination" />} className="fs-8 fw-semibold">
                    Elimination
                </MenuItem>
            </Menu>
        </Fragment>
    );
};

export default SidebarPlay;