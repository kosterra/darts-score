import { useState } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { FaBars, FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";

import NavigationContent from './navigation.content';
import { t } from '../../utils/i18n';

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
                {/* a small handle on the menu's edge, so the header stays free for the club */}
                <button
                    type="button"
                    className="nav-edge-toggle"
                    onClick={toggle}
                    aria-label={collapsed ? t('Expand the menu') : t('Collapse the menu')}
                    title={collapsed ? t('Expand the menu') : t('Collapse the menu')}
                >
                    {collapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
                </button>
            </aside>

            <div className="app-navigation-bar d-md-none">
                <button type="button" className="nav-bar-button" onClick={() => setDrawerOpen(true)} aria-label={t('Open the menu')}>
                    <FaBars aria-hidden="true" />
                    <span>{t('Menu')}</span>
                </button>
            </div>
            <Sidebar
                visible={drawerOpen}
                onHide={() => setDrawerOpen(false)}
                className="app-navigation-drawer"
                // tapping next to the drawer closes it, so it needs no close button of its own
                content={() => (
                    <NavigationContent onNavigate={() => setDrawerOpen(false)} />
                )}
            />
        </>
    );
};

export default AppNavigation;
