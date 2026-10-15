import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { Ripple } from 'primereact/ripple';
import { MdDashboard, MdSportsCricket } from "react-icons/md";
import { FaBullseye, FaChartLine, FaMedal, FaTrophy, FaUserPen, FaUsersGear, FaCircleQuestion, FaRightFromBracket, FaChevronDown, FaAnglesLeft, FaAnglesRight, FaXmark } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { PiClockCountdownBold } from "react-icons/pi";
import { GiDart } from "react-icons/gi";
import { BsPersonFillCheck } from "react-icons/bs";

import { useAuth } from '../../utils/auth.context';
import { CLUB_ROLES, ROLE_LABELS } from '../../services/user.service';
import { resolvePlayerInitials } from '../../utils/image.utils';
import ClubLogo from '../elements/club.logo';

/**
 * The menu, built for the logged-in user. Everything under "Club" belongs to
 * the selected club; admin entries only show for club admins, user
 * administration only for global admins.
 */
const useSections = () => {
    const { isClubAdmin, isGlobalAdmin } = useAuth();

    const gameLinks = (prefix) => [
        { label: 'X01', to: `${prefix}/x01` },
        { label: 'Cricket', to: `${prefix}/cricket` },
        { label: 'Elimination', to: `${prefix}/elimination` },
    ];

    const sections = [
        {
            title: 'Club',
            items: [
                { label: 'Dashboard', icon: MdDashboard, to: '/', end: true },
                { label: 'Player statistics', icon: FaChartLine, to: '/stats/players' },
                { label: 'Games', icon: FaTrophy, children: gameLinks('/stats/games') },
                { label: 'Badges', icon: FaMedal, to: '/badges' },
            ],
        },
        {
            title: "Let's play darts",
            items: [
                { label: 'X01', icon: FaBullseye, to: '/x01', end: true },
                { label: 'Cricket', icon: MdSportsCricket, to: '/cricket', end: true },
                { label: 'Elimination', icon: BiTargetLock, to: '/elimination', end: true },
            ],
        },
        { title: 'Training', items: [{ label: 'Around the Clock', icon: PiClockCountdownBold, to: '/training/atc' }] },
        {
            title: 'Admin',
            visible: isClubAdmin || isGlobalAdmin,
            items: [
                { label: 'Players', icon: FaUserPen, to: '/admin/players', visible: isClubAdmin },
                { label: 'Games', icon: GiDart, children: gameLinks('/admin/games'), visible: isClubAdmin },
                { label: 'Training', icon: BsPersonFillCheck, children: [{ label: 'Around the Clock', to: '/admin/training/atc' }], visible: isClubAdmin },
                { label: 'Users', icon: FaUsersGear, to: '/admin/users', visible: isGlobalAdmin },
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

    const roleOf = (club) => club.role === CLUB_ROLES.ADMIN ? 'Admin' : 'Player';

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
                className="club-switcher-button p-ripple"
                onClick={(event) => menu.current.toggle(event)}
                aria-haspopup="menu"
                aria-label={activeClub ? `Club: ${activeClub.name}. Switch club` : 'Choose a club'}
                title={collapsed ? (activeClub?.name ?? 'Choose a club') : undefined}
            >
                <span className="club-switcher-logo">
                    <ClubLogo club={activeClub} />
                    {/* collapsed, only the logo is shown: this badge marks it as a switcher */}
                    {collapsed && <span className="club-switcher-badge" aria-hidden="true"><FaChevronDown /></span>}
                </span>
                {!collapsed && (
                    <>
                        <span className="nav-label d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                            <span className="text-default fw-semibold text-truncate">{activeClub?.name ?? 'No club yet'}</span>
                            <span className="text-faint fs-8">{activeClub ? roleOf(activeClub) : 'Create or join a club'}</span>
                        </span>
                        <FaChevronDown className="nav-chevron" aria-hidden="true" />
                    </>
                )}
                <Ripple />
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
const NavigationContent = ({ collapsed = false, onToggle, onClose, onNavigate }) => {
    const { pathname } = useLocation();
    const { user, isGlobalAdmin, logout } = useAuth();
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
                    <Ripple />
                </NavLink>
            </li>
        );
    };

    const roleText = isGlobalAdmin ? ROLE_LABELS.globalAdmin : user.email;

    return (
        <div className={`app-navigation ${collapsed ? 'collapsed' : ''}`}>
            <div className="nav-header">
                <Link to="/" className="nav-brand" onClick={onNavigate} aria-label="Darts Score dashboard">
                    <img alt="" src="/logo.svg" width="40" height="40" />
                    <span className="nav-label fw-semibold">Darts Score</span>
                </Link>
                {onToggle &&
                    <button type="button" className="nav-icon-button" onClick={onToggle} aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}>
                        {collapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
                    </button>
                }
                {onClose &&
                    <button type="button" className="nav-icon-button" onClick={onClose} aria-label="Close the menu">
                        <FaXmark />
                    </button>
                }
            </div>

            <ClubSwitcher collapsed={collapsed} onNavigate={onNavigate} />

            <nav className="nav-sections" aria-label="Main">
                {sections.map((section, index) => (
                    <div key={section.title ?? index} className="nav-section">
                        {section.title && <div className="nav-section-title">{section.title}</div>}
                        <ul className="list-unstyled m-0">{section.items.map(renderItem)}</ul>
                    </div>
                ))}
                {/* About closes the menu, without a section of its own */}
                <ul className="nav-bottom list-unstyled m-0">
                    <li>
                        <NavLink to="/about" className={linkClass} title={collapsed ? 'About' : undefined} onClick={onNavigate}>
                            <FaCircleQuestion className="nav-icon" aria-hidden="true" />
                            <span className="nav-label">About</span>
                            <Ripple />
                        </NavLink>
                    </li>
                </ul>
            </nav>

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
