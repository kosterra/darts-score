import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaTrophy } from "react-icons/fa6";

import {
    Menu,
    MenuItem,
    SubMenu
} from 'react-pro-sidebar';

const SidebarStats = (props) => {
    const { collapsed } = props;

    return (
        <Fragment>
            {collapsed &&
                <hr className="menu-divider my-1" />
            }
            {!collapsed &&
                <div className="menu-subtitle fw-semibold fs-8 ps-4 py-2 pt-4">
                    Statistics
                </div>
            }
            <Menu>
                <SubMenu
                    label="Players"
                    icon={<FaChartLine className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/stats/players" />} className="fs-8 fw-semibold"> Players</MenuItem>
                    <MenuItem component={<Link to="/stats/vs" />} className="fs-8 fw-semibold"> Player vs. Player</MenuItem>
                </SubMenu>
                <SubMenu
                    label="Games"
                    icon={<FaTrophy className="fs-6" />}
                    className="fs-8 fw-semibold"
                >
                    <MenuItem component={<Link to="/stats/games/x01" />} className="fs-8 fw-semibold"> X01</MenuItem>
                    <MenuItem component={<Link to="/stats/games/cricket" />} className="fs-8 fw-semibold"> Cricket</MenuItem>
                    <MenuItem component={<Link to="/stats/games/elimination" />} className="fs-8 fw-semibold"> Elimination</MenuItem>
                </SubMenu>
            </Menu>
        </Fragment>
    );
};

export default SidebarStats;