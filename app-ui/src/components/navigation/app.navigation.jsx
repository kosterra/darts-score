import { useState } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { FaBars } from "react-icons/fa6";

import NavigationContent from './navigation.content';

const COLLAPSED_KEY = 'darts-score.navigationCollapsed';

const readCollapsed = () => {
    try {
        return localStorage.getItem(COLLAPSED_KEY) !== 'false';
    } catch {
        return true;
    }
};

/**
 * App navigation: a rail on the left from tablet size up, which expands from
 * icons to the full menu, and a PrimeReact drawer opened from the bottom bar
 * on phones.
 */
const AppNavigation = () => {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggle = () => {
        setCollapsed(!collapsed);
        try {
            localStorage.setItem(COLLAPSED_KEY, String(!collapsed));
        } catch {
            // the choice just lasts until reload
        }
    };

    return (
        <>
            <aside className={`app-navigation-rail d-none d-md-block ${collapsed ? 'collapsed' : ''}`}>
                <NavigationContent collapsed={collapsed} onToggle={toggle} />
            </aside>

            <div className="app-navigation-bar d-md-none">
                <button type="button" className="nav-icon-button" onClick={() => setDrawerOpen(true)} aria-label="Open the menu">
                    <FaBars />
                </button>
            </div>
            <Sidebar
                visible={drawerOpen}
                onHide={() => setDrawerOpen(false)}
                className="app-navigation-drawer"
                content={() => (
                    <NavigationContent onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
                )}
            />
        </>
    );
};

export default AppNavigation;
