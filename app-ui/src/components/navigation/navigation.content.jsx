import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { Ripple } from 'primereact/ripple';
import { MdDashboard, MdSportsCricket } from "react-icons/md";
import { FaBullseye, FaChartLine, FaMedal, FaTrophy, FaUserPen, FaRightFromBracket, FaShieldHalved, FaChevronDown, FaPeopleGroup, FaBell, FaBug, FaUserGear } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { PiClockCountdownBold, PiClockClockwiseBold } from "react-icons/pi";
import { GiDart } from "react-icons/gi";
import { BsPersonFillCheck } from "react-icons/bs";

import { useAuth } from '../../utils/auth.context';
import { ROLE_LABELS } from '../../services/user.service';
import { resolvePlayerInitials } from '../../utils/image.utils';
import ClubLogo from '../elements/club.logo';
import AdminService from '../../services/admin.service';
import { ALERTS_CHANGED } from '../admin/alert.events';

/**
 * Open spam alerts, for the count next to "Alerts". Only global admins see
 * them; the count follows page changes, the alerts page and a minute's timer.
 */
const useOpenAlerts = (enabled) => {
    const { pathname } = useLocation();
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        if (!enabled) return undefined;
        const load = () => AdminService.loadAlertSummary().then(setSummary).catch(() => {});
        load();
        const timer = setInterval(load, 60 * 1000);
        window.addEventListener(ALERTS_CHANGED, load);
        return () => {
            clearInterval(timer);
            window.removeEventListener(ALERTS_CHANGED, load);
        };
    }, [enabled, pathname]);

    return enabled ? summary : null;
};

/**
 * The menu, built for the logged-in user. Everything under "Club" belongs to
 * the selected club; its players see everything there, only its admins can change it. "Admin"
 * spans all clubs and is for global admins only.
 */
const useSections = () => {
    const { activeClub, isGlobalAdmin } = useAuth();
    // a global admin without a club of their own only looks after the app
    const hasClub = !!activeClub;
    const openAlerts = useOpenAlerts(isGlobalAdmin);

    const sections = [
        {
            title: 'Club',
            visible: hasClub,
            items: [
                { label: 'Dashboard', icon: MdDashboard, to: '/', end: true },
                { label: 'Players', icon: FaUserPen, to: '/players' },
                { label: 'Player comparison', icon: FaChartLine, to: '/stats/players' },
                { label: 'Games', icon: FaTrophy, to: '/games' },
                { label: 'Trainings', icon: BsPersonFillCheck, to: '/trainings' },
                { label: 'Badges', icon: FaMedal, to: '/badges' },
            ],
        },
        {
            title: "Let's play darts",
            visible: hasClub,
            items: [
                { label: 'X01', icon: FaBullseye, to: '/x01', end: true },
                { label: 'Cricket', icon: MdSportsCricket, to: '/cricket', end: true },
                { label: 'Elimination', icon: BiTargetLock, to: '/elimination', end: true },
                { label: 'Around the Clock', icon: PiClockClockwiseBold, to: '/clock', end: true },
            ],
        },
        { title: 'Training', visible: hasClub, items: [{ label: 'Around the Clock', icon: PiClockCountdownBold, to: '/training/atc' }] },
        {
            // for global admins: the lists across all clubs, watching over the app and its administration
            title: 'Admin',
            visible: isGlobalAdmin,
            items: [
                { label: 'Clubs', icon: FaPeopleGroup, to: '/admin/clubs' },
                { label: 'Users', icon: FaUserGear, to: '/admin/users' },
                { label: 'Players', icon: FaUserPen, to: '/admin/players' },
                { label: 'Games', icon: GiDart, to: '/admin/games' },
                { label: 'Trainings', icon: BsPersonFillCheck, to: '/admin/trainings' },
                {
                    label: 'Alerts',
                    icon: FaBell,
                    to: '/admin/alerts',
                    badge: openAlerts?.open || null,
                    badgeCritical: openAlerts?.critical > 0,
                },
                { label: 'Error log', icon: FaBug, to: '/admin/logs' },
                { label: 'Administration', icon: FaShieldHalved, to: '/administration' },
            ],
        },
    ];

    return sections
        .filter(section => section.visible !== false)
        .map(section => ({
            ...section,
            // groups are told apart by section, since "Games" exists under Club and Admin
            items: section.items.filter(item => item.visible !== false).map(item => ({ ...item, key: `${section.title ?? ''}/${item.label}` })),
        }));
};

/**
 * Shows the selected club and switches to another one from a popup list.
 */
const ClubSwitcher = ({ collapsed, onNavigate }) => {
    const menu = useRef(null);
    const navigate = useNavigate();
    const { clubs, activeClub, selectClub } = useAuth();


    const model = [
        {
            label: 'Your clubs',
            items: clubs.map(club => ({
                label: club.name,
                icon: club.id === activeClub?.id ? 'pi pi-check' : 'pi pi-fw',
                className: club.id === activeClub?.id ? 'club-switcher-current' : '',
                command: () => {
                    if (club.id !== activeClub?.id) {
                        selectClub(club.id);
                        navigate('/');
                    }
                    onNavigate?.();
                },
            })),
        },
        { separator: true },
        { label: 'Manage clubs', icon: 'pi pi-cog', command: () => { navigate('/clubs'); onNavigate?.(); } },
    ];

    return (
        <div className="club-switcher">
            <button
                type="button"
                className="club-switcher-button"
                onClick={(event) => menu.current.toggle(event)}
                aria-haspopup="menu"
                aria-label={activeClub ? `Club: ${activeClub.name}. Switch club` : 'Choose a club'}
                title={collapsed ? (activeClub?.name ?? 'Choose a club') : undefined}
            >
                <span className="club-switcher-logo">
                    <ClubLogo club={activeClub} />
                    {/* the badge on the logo marks it as a switcher, expanded and collapsed */}
                    <span className="club-switcher-badge" aria-hidden="true"><FaChevronDown /></span>
                </span>
                {!collapsed &&
                    <span className="club-switcher-name text-default fw-semibold">{activeClub?.name ?? 'Choose a club'}</span>
                }
            </button>
            <Menu model={model} popup ref={menu} className="club-switcher-menu" />
        </div>
    );
};

const isInside = (item, pathname) =>
    item.children?.some(child => child.to && (pathname === child.to || pathname.startsWith(child.to + '/')));

/**
 * The navigation itself: logo, menu and the profile of the logged-in user.
 * "collapsed" shows icons only (desktop rail); "onNavigate" closes the drawer on phones.
 */
const NavigationContent = ({ collapsed = false, onToggle, onNavigate }) => {
    const { pathname } = useLocation();
    const { user, activeClub, isGlobalAdmin, logout } = useAuth();
    const sections = useSections();

    // groups start open when they contain the current page
    const [openGroups, setOpenGroups] = useState(() => new Set());
    useEffect(() => {
        const current = sections.flatMap(section => section.items).filter(item => isInside(item, pathname)).map(item => item.key);
        if (current.length) setOpenGroups(open => new Set([...open, ...current]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const toggleGroup = (key) => {
        // in the icon rail a group can only open once the menu is wide again
        if (collapsed) {
            onToggle?.();
            setOpenGroups(open => new Set([...open, key]));
            return;
        }
        setOpenGroups(open => {
            const next = new Set(open);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const linkClass = ({ isActive }) => `nav-link-item p-ripple ${isActive ? 'active' : ''}`;

    const renderChild = (child) => child.to
        ? (
            <NavLink key={child.label} to={child.to} end className={linkClass} onClick={onNavigate}>
                <span className="nav-label">{child.label}</span>
                <Ripple />
            </NavLink>
        )
        : (
            <button key={child.label} type="button" className="nav-link-item p-ripple" onClick={() => { child.onClick(); onNavigate?.(); }}>
                <span className="nav-label">{child.label}</span>
                <Ripple />
            </button>
        );

    const renderItem = (item) => {
        const Icon = item.icon;
        if (item.children) {
            const open = openGroups.has(item.key) && !collapsed;
            return (
                <li key={item.key}>
                    <button
                        type="button"
                        className={`nav-link-item p-ripple ${isInside(item, pathname) ? 'contains-active' : ''}`}
                        aria-expanded={open}
                        title={collapsed ? item.label : undefined}
                        onClick={() => toggleGroup(item.key)}
                    >
                        <Icon className="nav-icon" aria-hidden="true" />
                        <span className="nav-label">{item.label}</span>
                        <FaChevronDown className={`nav-chevron ${open ? 'open' : ''}`} aria-hidden="true" />
                        <Ripple />
                    </button>
                    {open && <div className="nav-group">{item.children.map(renderChild)}</div>}
                </li>
            );
        }
        return (
            <li key={item.key}>
                <NavLink to={item.to} end={item.end} className={linkClass} title={collapsed ? item.label : undefined} onClick={onNavigate}>
                    <Icon className="nav-icon" aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                    {item.badge &&
                        <span className={`nav-badge ${item.badgeCritical ? 'critical' : ''}`} aria-label={`${item.badge} open`}>
                            {item.badge > 99 ? '99+' : item.badge}
                        </span>
                    }
                    <Ripple />
                </NavLink>
            </li>
        );
    };

    const roleText = isGlobalAdmin ? ROLE_LABELS.globalAdmin : user.email;

    return (
        <div className={`app-navigation ${collapsed ? 'collapsed' : ''}`}>
            {/* the club is what you work in, so it leads the menu; the app itself sits quietly at the bottom.
                A global admin without clubs has nothing to switch and sees the app instead. */}
            <div className="nav-header">
                {(activeClub || !isGlobalAdmin)
                    ? <ClubSwitcher collapsed={collapsed} onNavigate={onNavigate} />
                    : (
                        <Link to="/" className="nav-brand" onClick={onNavigate} aria-label="Oche">
                            <img alt="" src="/logo.svg" width="40" height="40" />
                            <span className="nav-label fw-semibold">Oche</span>
                        </Link>
                    )
                }
            </div>

            <nav className="nav-sections" aria-label="Main">
                {sections.map((section, index) => (
                    <div key={section.title ?? index} className="nav-section">
                        {section.title && <div className="nav-section-title">{section.title}</div>}
                        <ul className="list-unstyled m-0">{section.items.map(renderItem)}</ul>
                    </div>
                ))}
            </nav>

            {/* the app: its name and version, opening the About page */}
            <div className="nav-app">
                <NavLink to="/about" className={({ isActive }) => `nav-app-link p-ripple ${isActive ? 'active' : ''}`} title={collapsed ? 'About Oche' : undefined} onClick={onNavigate}>
                    <img alt="" src="/logo.svg" width="24" height="24" />
                    {!collapsed &&
                        <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span className="text-subtle fw-semibold fs-7">Oche</span>
                            <span className="text-faint fs-9">About · {import.meta.env.VITE_APP_VERSION}</span>
                        </span>
                    }
                    <Ripple />
                </NavLink>
            </div>

            <div className="nav-profile">
                <Link to="/profile" className="nav-profile-link p-ripple" onClick={onNavigate} title={collapsed ? 'Your profile' : undefined}>
                    <Avatar label={resolvePlayerInitials(user.firstname, user.lastname)} shape="circle" className="avatar-sm bg-surface-high flex-shrink-0" />
                    <span className="nav-label d-flex flex-column" style={{ minWidth: 0 }}>
                        <span className="text-default fw-semibold text-truncate">{user.firstname} {user.lastname}</span>
                        <span className="text-faint fs-8 text-truncate">{roleText}</span>
                    </span>
                    <Ripple />
                </Link>
                <button type="button" className="nav-icon-button nav-label" onClick={logout} aria-label="Log out" title="Log out">
                    <FaRightFromBracket />
                </button>
            </div>
        </div>
    );
};

export default NavigationContent;
