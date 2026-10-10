import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { PiClockCountdownBold } from "react-icons/pi";
import { Menu, MenuItem } from 'react-pro-sidebar';


const SidebarTraining = (props) => {
    const { collapsed } = props;

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            {!collapsed &&
                <div className="menu-subtitle fw-semibold fs-8 ps-4 py-2 pt-4">
                    Training
                </div>
            }
            <Menu>
                <MenuItem icon={<PiClockCountdownBold className="fs-6" />} component={<Link to="/training/atc" />} className="fs-8 fw-semibold">
                    Around the clock
                </MenuItem>
            </Menu>
        </Fragment>
    );
};

export default SidebarTraining;