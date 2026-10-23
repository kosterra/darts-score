import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { Ripple } from 'primereact/ripple';
import { MdDashboard, MdSportsCricket } from "react-icons/md";
import { FaScaleBalanced, FaBullseye, FaChartLine, FaMedal, FaTrophy, FaUserPen, FaShieldHalved, FaChevronDown, FaChartSimple, FaRobot, FaRightFromBracket, FaPeopleGroup, FaBell, FaBug, FaUserGear, FaBolt } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { PiClockCountdownBold, PiClockClockwiseBold } from "react-icons/pi";
import { GiDart, GiDiceTarget, GiStairsGoal } from "react-icons/gi";
import { BsPersonFillCheck } from "react-icons/bs";

import { useAuth } from '../../utils/auth.context';
import { isEnabled, RULES_KINDS } from '../../rules/club.rules';
import { ROLE_LABELS } from '../../services/user.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import ClubLogo from '../elements/club.logo';
import AdminService from '../../services/admin.service';
import { ALERTS_CHANGED } from '../admin/alert.events';
import IntegrityService, { FAIR_PLAY_CHANGED } from '../../services/integrity.service';
import NotificationService, { NOTIFICATIONS_CHANGED } from '../../services/notification.service';
import { t } from '../../utils/i18n';

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
 * What fair play has waiting (impossible, and suspicious not looked at yet),
 * for the count next to "Fair play": of the selected club for its admins, of
 * every club for global admins ("all"). Follows page changes, the fair play
 * page and a few minutes' timer.
 */
const useFairPlay = (enabled, all, clubId) => {
    const { pathname } = useLocation();
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        if (!enabled) return undefined;
        const load = () => IntegrityService.loadSummary(all).then(setSummary).catch(() => {});
        load();
        const timer = setInterval(load, 5 * 60 * 1000);
        window.addEventListener(FAIR_PLAY_CHANGED, load);
        return () => {
            clearInterval(timer);
            window.removeEventListener(FAIR_PLAY_CHANGED, load);
        };
    }, [enabled, all, clubId, pathname]);

    return enabled ? summary : null;
};

/**
 * How many notifications the user has not read, for the bell. Follows page
 * changes, the notifications page and a minute's timer.
 */
const useUnreadNotifications = () => {
    const { pathname } = useLocation();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        const load = () => NotificationService.loadUnread().then(result => setUnread(result.unread ?? 0)).catch(() => {});
        load();
        const timer = setInterval(load, 60 * 1000);
        window.addEventListener(NOTIFICATIONS_CHANGED, load);
        return () => {
            clearInterval(timer);
            window.removeEventListener(NOTIFICATIONS_CHANGED, load);
        };
    }, [pathname]);

    return unread;
};

const countText = (count) => count > 99 ? '99+' : count;

/**
 * The menu, built for the logged-in user. Everything under "Club" belongs to
 * the selected club; its players see everything there, only its admins can change it. "Admin"
 * spans all clubs and is for global admins only.
 */
const useSections = () => {
    const { activeClub, isGlobalAdmin, isClubAdmin } = useAuth();
    // a global admin without a club of their own only looks after the app
    const hasClub = !!activeClub;
    const openAlerts = useOpenAlerts(isGlobalAdmin);
    const clubFairPlay = useFairPlay(isClubAdmin && hasClub, false, activeClub?.id);
    const allFairPlay = useFairPlay(isGlobalAdmin, true, null);
    // the user's own statistics in this club, one click away
    const myPlayer = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);

    const sections = [
        {
            title: t('Club'),
            visible: hasClub,
            items: [
                { label: t('Dashboard'), icon: MdDashboard, to: '/', end: true },
                { label: t('My statistics'), icon: FaChartSimple, to: myPlayer ? `/players/${myPlayer.id}` : '/me', visible: Boolean(myPlayer) },
                // on the own player the entry above is the one that is marked
                { label: t('Players'), icon: FaUserPen, to: '/players', notActiveOn: myPlayer ? [`/players/${myPlayer.id}`] : [] },
                { label: t('Player comparison'), icon: FaChartLine, to: '/stats/players' },
                { label: t('Games'), icon: FaTrophy, to: '/games' },
                { label: t('Trainings'), icon: BsPersonFillCheck, to: '/trainings' },
                { label: t('Badges'), icon: FaMedal, to: '/badges' },
                // for the club's admins: games and trainings that cannot be real or are worth a look
                ...(isClubAdmin ? [{
                    label: t('Fair play'),
                    icon: FaScaleBalanced,
                    to: '/fair-play',
                    badge: clubFairPlay?.open || null,
                    // red while something impossible waits to be deleted
                    badgeCritical: clubFairPlay?.impossible > 0,
                }] : []),
            ],
        },
        {
            title: t('Let\'s play darts'),
            visible: hasClub,
            items: [
                // only the games the club plays
                ...[
                    { game: 'x01', label: t('X01'), icon: FaBullseye, to: '/x01', end: true },
                    { game: 'cricket', label: t('Cricket'), icon: MdSportsCricket, to: '/cricket', end: true },
                    { game: 'elimination', label: t('Elimination'), icon: BiTargetLock, to: '/elimination', end: true },
                    { game: 'clock', label: t('Around the Clock'), icon: PiClockClockwiseBold, to: '/clock', end: true },
                ].filter(item => isEnabled(item.game, activeClub?.gameRules)),
                ...(RULES_KINDS.some(kind => isEnabled(kind, activeClub?.gameRules)) ? [{ label: t('More games'), icon: GiDiceTarget, to: '/play' }] : []),
            ],
        },
        {
            title: t('Training'),
            visible: hasClub,
            items: [
                // in the order of the games above
                { label: t('X01 against the bot'), icon: FaRobot, to: '/training/x01' },
                { label: t('Around the Clock'), icon: PiClockCountdownBold, to: '/training/atc' },
                { label: t('More trainings'), icon: GiStairsGoal, to: '/training/more' },
            ],
        },
        // for global admins, across all clubs: who uses the app, what was played, what needs watching, and the installation
        {
            title: t('Admin · Accounts'),
            visible: isGlobalAdmin,
            items: [
                { label: t('Clubs'), icon: FaPeopleGroup, to: '/admin/clubs' },
                { label: t('Users'), icon: FaUserGear, to: '/admin/users' },
                { label: t('Players'), icon: FaUserPen, to: '/admin/players' },
            ],
        },
        {
            title: t('Admin · Played'),
            visible: isGlobalAdmin,
            items: [
                { label: t('Games'), icon: GiDart, to: '/admin/games' },
                { label: t('Trainings'), icon: BsPersonFillCheck, to: '/admin/trainings' },
                { label: t('Quick games'), icon: FaBolt, to: '/admin/quick-games' },
            ],
        },
        {
            title: t('Admin · Monitoring'),
            visible: isGlobalAdmin,
            items: [
                {
                    label: t('Fair play'),
                    icon: FaScaleBalanced,
                    to: '/admin/fair-play',
                    badge: allFairPlay?.open || null,
                    badgeCritical: allFairPlay?.impossible > 0,
                },
                {
                    label: t('Alerts'),
                    icon: FaBell,
                    to: '/admin/alerts',
                    badge: openAlerts?.open || null,
                    badgeCritical: openAlerts?.critical > 0,
                },
                { label: t('Error log'), icon: FaBug, to: '/admin/logs' },
            ],
        },
        {
            title: t('Admin · System'),
            visible: isGlobalAdmin,
            items: [
                { label: t('System settings'), icon: FaShieldHalved, to: '/system-settings' },
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
            label: t('Your clubs'),
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
        { label: t('My clubs'), icon: 'pi pi-cog', command: () => { navigate('/my-clubs'); onNavigate?.(); } },
    ];

    return (
        <div className="club-switcher">
            <button
                type="button"
                className="club-switcher-button"
                onClick={(event) => menu.current.toggle(event)}
                aria-haspopup="menu"
                aria-label={activeClub ? t('Club: {{name}}. Switch club', { name: activeClub.name }) : t('Choose a club')}
                title={collapsed ? (activeClub?.name ?? t('Choose a club')) : undefined}
            >
                <span className="club-switcher-logo">
                    <ClubLogo club={activeClub} />
                    {/* the badge on the logo marks it as a switcher, expanded and collapsed */}
                    <span className="club-switcher-badge" aria-hidden="true"><FaChevronDown /></span>
                </span>
                {!collapsed &&
                    <span className="club-switcher-name text-default fw-semibold">{activeClub?.name ?? t('Choose a club')}</span>
                }
            </button>
            <Menu model={model} popup ref={menu} className="club-switcher-menu" />
        </div>
    );
};

const PROFILE_PATHS = ['/profile', '/player-profile', '/my-clubs', '/notifications'];

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
    const unread = useUnreadNotifications();
    // the user's players: one picture for the account, shown on the avatar
    const myPlayers = useMyPlayers(!isGlobalAdmin);
    const picture = (myPlayers ?? []).find(player => player.profileImg)?.profileImg ?? '';

    // groups start open when they contain the current page
    const [openGroups, setOpenGroups] = useState(() => new Set());
    useEffect(() => {
        const current = sections.flatMap(section => section.items).filter(item => isInside(item, pathname)).map(item => item.key);
        if (current.length) setOpenGroups(open => new Set([...open, ...current]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // the user's group is open on its own pages and closes when another page opens
    // (an entry outside it); its own entries keep it open
    const [profileOpen, setProfileOpen] = useState(() => PROFILE_PATHS.includes(pathname));
    useEffect(() => {
        setProfileOpen(PROFILE_PATHS.includes(pathname));
    }, [pathname]);
    const toggleProfile = () => {
        // in the icon rail it opens once the menu is wide again
        if (collapsed) {
            onToggle?.();
            setProfileOpen(true);
            return;
        }
        setProfileOpen(open => !open);
    };

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
                <NavLink to={item.to} end={item.end} className={({ isActive }) => linkClass({ isActive: isActive && !item.notActiveOn?.includes(pathname) })} title={collapsed ? item.label : undefined} onClick={onNavigate}>
                    <Icon className="nav-icon" aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                    {item.badge &&
                        <span className={`nav-badge ${item.badgeCritical ? 'critical' : ''}`} aria-label={t('{{badge}} open', { badge: item.badge })}>
                            {countText(item.badge)}
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
                        <Link to="/" className="nav-brand" onClick={onNavigate} aria-label={t('Oche')}>
                            <img alt="" src="/logo.svg" width="40" height="40" />
                            <span className="nav-label fw-semibold">{t('Oche')}</span>
                        </Link>
                    )
                }
            </div>

            <nav className="nav-sections" aria-label={t('Main')}>
                {sections.map((section, index) => (
                    <div key={section.title ?? index} className="nav-section">
                        {section.title && <div className="nav-section-title">{section.title}</div>}
                        <ul className="list-unstyled m-0">{section.items.map(renderItem)}</ul>
                    </div>
                ))}
            </nav>

            {/* the app: its name and version, opening the About page */}
            <div className="nav-app">
                <NavLink to="/about" className={({ isActive }) => `nav-app-link p-ripple ${isActive ? 'active' : ''}`} title={collapsed ? t('About Oche') : undefined} onClick={onNavigate}>
                    <img alt="" src="/logo.svg" width="24" height="24" />
                    {!collapsed &&
                        <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span className="text-subtle fw-semibold fs-7">{t('Oche')}</span>
                            <span className="text-faint fs-9">{t('About ·')}{' '}{import.meta.env.VITE_APP_VERSION}</span>
                        </span>
                    }
                    <Ripple />
                </NavLink>
            </div>

            {/* the user: a group with the profile, the notifications and logging out; the count of unread ones on it */}
            <div className={`nav-profile ${profileOpen ? 'open' : ''}`}>
                <button
                    type="button"
                    className={`nav-profile-link p-ripple ${PROFILE_PATHS.includes(pathname) ? 'contains-active' : ''}`}
                    onClick={toggleProfile}
                    aria-expanded={profileOpen}
                    title={collapsed ? `${user.firstname} ${user.lastname}${unread ? t(' · {{unread}} unread notifications', { unread: unread }) : ''}` : undefined}
                >
                    {/* the count sits on the avatar's corner, so the name keeps the room */}
                    <span className="nav-avatar">
                        <Avatar
                            image={picture ? resolvePlayerImg(picture) : undefined}
                            label={picture ? undefined : resolvePlayerInitials(user.firstname, user.lastname)}
                            shape="circle"
                            className="avatar-sm bg-surface-high"
                        />
                        {unread > 0 && <span className="nav-badge" aria-label={t('{{unread}} unread notifications', { unread: unread })}>{countText(unread)}</span>}
                    </span>
                    <span className="nav-label nav-profile-name">
                        <span className="text-default fw-semibold">{user.firstname} {user.lastname}</span>
                        <span className="text-faint fs-8">{roleText}</span>
                    </span>
                    <FaChevronDown className={`nav-chevron ${profileOpen ? 'open' : ''}`} aria-hidden="true" />
                    <Ripple />
                </button>
                {profileOpen && !collapsed &&
                    <div className="nav-group">
                        <NavLink to="/profile" end className={linkClass} onClick={onNavigate}>
                            <span className="nav-label">{t('User profile')}</span>
                            <Ripple />
                        </NavLink>
                        {!isGlobalAdmin && <>
                            <NavLink to="/player-profile" end className={linkClass} onClick={onNavigate}>
                                <span className="nav-label">{t('Player profile')}</span>
                                <Ripple />
                            </NavLink>
                            <NavLink to="/my-clubs" end className={linkClass} onClick={onNavigate}>
                                <span className="nav-label">{t('My clubs')}</span>
                                <Ripple />
                            </NavLink>
                        </>}
                        <NavLink to="/notifications" end className={linkClass} onClick={onNavigate}>
                            <span className="nav-label">{t('Notifications')}</span>
                            {unread > 0 && <span className="nav-badge" aria-label={t('{{unread}} unread', { unread: unread })}>{countText(unread)}</span>}
                            <Ripple />
                        </NavLink>
                        <button type="button" className="nav-link-item p-ripple" onClick={logout}>
                            <span className="nav-label">{t('Log out')}</span>
                            <FaRightFromBracket className="nav-group-icon" aria-hidden="true" />
                            <Ripple />
                        </button>
                    </div>
                }
            </div>
        </div>
    );
};

export default NavigationContent;
