import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { FaGithub } from "react-icons/fa6";

import RULES from './rules';
import { PLAYER_GUIDE, ADMIN_GUIDE } from './guides';
import LevelsSection from './levels.section';
import ReleaseNotes from './release.notes';
import BadgeMedal from '../badges/badge.medal';
import ShameMedal from '../badges/shame.medal';
import ClubMedal from '../badges/club.medal';
import { requestJSON } from '../../utils/service.utils';
import { Lines } from '../elements/skeletons';
import { locale, t } from '../../utils/i18n';
import { ISSUES, REPOSITORY } from '../../utils/project';
import { Licence } from '../landing/public.frame';


// the parts of the page, each with its own address (/about#levels)
const SECTIONS = [
    { value: 'news', label: t('What\'s new') },
    { value: 'rules', label: t('How to play') },
    { value: 'levels', label: t('Levels') },
    { value: 'badges', label: t('Badges') },
    { value: 'players', label: t('Player guide') },
    { value: 'admins', label: t('Club admin guide') },
];

// topics of a guide or the rules: cards, the first one across the full width
const Topics = ({ topics, firstWide = false }) => (
    <div className="row g-3 p-1">
        {topics.map(({ title, icon: Icon, body }, index) => (
            <section key={title} className={firstWide && index === 0 ? 'col-12' : 'col-12 col-lg-6'}>
                <div className="about-rule bg-surface-raised rounded-2 p-4 h-100">
                    <h2 className="d-flex align-items-center gap-3 fs-6 fw-semibold text-default mb-3">
                        <span className="about-rule-icon" aria-hidden="true"><Icon /></span>
                        {title}
                    </h2>
                    <div className="text-subtle fs-7 about-rules">{body}</div>
                </div>
            </section>
        ))}
    </div>
);

/**
 * What the app is, what is new, how the games work, the levels, which badges
 * exist, and the manuals for players and club admins.
 */
const AboutCard = () => {
    const [catalogue, setCatalogue] = useState(null);
    const { hash } = useLocation();
    const navigate = useNavigate();
    const section = SECTIONS.find(entry => `#${entry.value}` === hash)?.value ?? 'news';

    useEffect(() => {
        requestJSON('/api/badges').then(setCatalogue).catch(error => console.error('Failed to load the badges', error));
    }, []);

    // category -> series (badges of one group, in tier order)
    const categories = (catalogue?.categories ?? []).map(({ category, title }) => {
        const series = [];
        for (const badge of catalogue.badges.filter(b => b.category === category)) {
            if (series.at(-1)?.[0].group !== badge.group) series.push([]);
            series.at(-1).push(badge);
        }
        return { category, title, series };
    });
    // the club's badges as series too
    const clubSeries = [];
    for (const badge of catalogue?.club?.badges ?? []) {
        if (clubSeries.at(-1)?.[0].group !== badge.group) clubSeries.push([]);
        clubSeries.at(-1).push(badge);
    }

    return (
        <div className="d-flex flex-column gap-4 page-reading">
            <header className="hero-header rounded-2 p-4 d-flex flex-wrap align-items-center gap-4">
                <img alt="" src="/logo.svg" width="80" height="80" />
                <div className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                    <h1 className="fs-2 fw-semibold text-default m-0">{t('Oche')}</h1>
                    <span className="text-subtle">{t('The scoreboard for your club, your pub team or your living room.')}</span>
                    <span className="text-faint fs-7">{t('Version')}{' '}{import.meta.env.VITE_APP_VERSION}{' '}{'· '}<Licence className="" />{' · '}<Link to="/privacy">{t('Privacy')}</Link>{' · '}<Link to="/privacy#imprint">{t('Imprint')}</Link>{' · '}<Link to="/support"><i className="pi pi-heart me-1" aria-hidden="true" />{t('Support Oche')}</Link></span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <a href={REPOSITORY} target="_blank" rel="noopener noreferrer" className="p-button p-button-sm p-button-outlined">
                        <FaGithub className="me-2" aria-hidden="true" />{t('Source code')}
                    </a>
                    <a href={ISSUES} target="_blank" rel="noopener noreferrer" className="p-button p-button-sm">
                        <i className="pi pi-comment me-2" aria-hidden="true" />{t('Report a problem or idea')}
                    </a>
                </div>
            </header>

            <SelectButton
                value={section}
                options={SECTIONS}
                onChange={(event) => event.value && navigate({ hash: event.value === 'news' ? '' : event.value }, { replace: true })}
                className="p-selectbutton-pills pills-inline flex-wrap"
                aria-label={t('Part of the page')}
            />

            {section === 'news' &&
                <Panel header={t('What\'s new')}>
                    <ReleaseNotes />
                </Panel>
            }

            {section === 'rules' &&
                <Panel header={t('How to play')}>
                    {/* entering darts applies to every game, so it spans the full width above the four game modes */}
                    <Topics topics={RULES} firstWide />
                    <p className="text-subtle fs-7 mt-3 mb-0">
                        {t('New to darts, or a term you do not know?')}{' '}<Link to="/darts-terms">{t('Darts A–Z')}</Link>
                    </p>
                </Panel>
            }

            {section === 'levels' &&
                <Panel header={t('Levels')}>
                    <LevelsSection levels={catalogue?.levels} rules={catalogue?.xpRules} flights={catalogue?.flights} />
                </Panel>
            }

            {section === 'players' &&
                <Panel header={t('Player guide')}>
                    <Topics topics={PLAYER_GUIDE} />
                </Panel>
            }

            {section === 'admins' &&
                <Panel header={t('Club admin guide')}>
                    <p className="text-subtle fs-7 px-2 pt-2 mb-2">{t('Everything a club admin looks after, besides playing. Admins see and can do everything in their club; players see it too, but only admins change it.')}</p>
                    <Topics topics={ADMIN_GUIDE} />
                </Panel>
            }

            {section === 'badges' &&
            <Panel header={t('Badges')}>
                <div className="d-flex flex-column gap-4 p-2">
                    {/* three kinds: what a player earns, what a player gets but nobody wants, and what the club earns together */}
                    <div className="d-flex flex-column gap-3">
                        <p className="text-subtle fs-7 m-0">{t('Badges are earned by themselves in games and trainings. There are three kinds:')}</p>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                            <li className="d-flex align-items-center gap-3">
                                {catalogue?.badges?.[0] && <BadgeMedal badge={catalogue.badges.find(badge => badge.tier === 3) ?? catalogue.badges[0]} size="sm" />}
                                <span className="fs-7"><strong className="text-default">{t('Player badges')}</strong>{' '}<span className="text-subtle">{t('(round): each player earns them for what they do, in all their clubs. Each adds XP to the player\'s level.')}</span></span>
                            </li>
                            <li className="d-flex align-items-center gap-3">
                                {catalogue?.shame?.[0] && <ShameMedal badge={catalogue.shame[0]} size="sm" />}
                                <span className="fs-7"><strong className="text-default">{t('Hall of Shame')}</strong>{' '}<span className="text-subtle">{t('(round, in rust): player badges too, the ones nobody wants. They add no XP and can be washed off.')}</span></span>
                            </li>
                            <li className="d-flex align-items-center gap-3">
                                {catalogue?.club?.badges?.[0] && <ClubMedal badge={catalogue.club.badges[0]} size="sm" />}
                                <span className="fs-7"><strong className="text-default">{t('Club badges')}</strong>{' '}<span className="text-subtle">{t('(a shield): the club earns them together, with the games and trainings of all its members. They belong to the club and add no XP.')}</span></span>
                            </li>
                        </ul>
                    </div>
                    {!catalogue && <Lines count={6} />}

                    {catalogue &&
                        <section className="d-flex flex-column gap-4">
                            <div className="d-flex flex-column gap-2">
                                <h2 className="about-badge-kind">{t('Player badges')}</h2>
                                <p className="text-subtle fs-7 m-0">
                                    {t('Earned by each player for themselves, in series that get harder tier by tier (bronze, silver, gold and up). Each one adds XP to the player level. Your own collection is on your profile and under')}{' '}<Link to="/badges">{t('Club → Badges')}</Link>{t(', next to the flights and barrels you collected with your flight points (see')}{' '}<Link to="#levels">{t('Levels')}</Link>).
                                </p>
                            </div>
                            {categories.map(category => (
                                <section key={category.category} className="d-flex flex-column gap-3">
                                    <h3 className="game-setup-section-title m-0">{category.title}</h3>
                                    <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                        {category.series.map(badges => (
                                            <li key={badges[0].group} className="d-flex align-items-center gap-3">
                                                <BadgeMedal badge={badges.at(-1)} size="sm" />
                                                <div className="d-flex flex-column min-w-0">
                                                    <span className="text-default fs-7 fw-semibold">{badges[0].groupTitle}</span>
                                                    <span className="text-faint fs-8">
                                                        {badges.length === 1
                                                            ? badges[0].description
                                                            : badges.map(badge => `${badge.title} (${badge.targetLabel ?? new Intl.NumberFormat(locale()).format(badge.target)})`).join(' · ')}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </section>
                    }

                    {catalogue?.shame?.length > 0 &&
                        <section className="d-flex flex-column gap-3">
                            <div className="d-flex flex-column gap-2">
                                <h2 className="about-badge-kind">{t('Hall of Shame: the player badges nobody wants')}</h2>
                                <p className="text-subtle fs-7 m-0">
                                    {t('These are player badges too: a player gets them for a bad moment of their own. In every club one player holds each of them, whoever got it last; they show on the dashboard and next to the name during X01, Cricket and Elimination games. A player keeps one until someone else gets it, or until they wash it off with the good deed written next to it. They add no XP. A club admin can switch them off, or keep them and leave children out (under 16, or another age the club chooses); a player without a date of birth is never in the Hall of Shame.')}
                                </p>
                            </div>
                            <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                {catalogue.shame.map(badge => (
                                    <li key={badge.id} className="d-flex align-items-center gap-3">
                                        <ShameMedal badge={badge} size="sm" />
                                        <div className="d-flex flex-column min-w-0">
                                            <span className="text-default fs-7 fw-semibold">{badge.title}</span>
                                            <span className="text-faint fs-8">{badge.description}{' '}{t('· Wash it off:')}{' '}{badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    }

                    {catalogue?.club?.badges?.length > 0 &&
                        <section className="d-flex flex-column gap-3">
                            <div className="d-flex flex-column gap-2">
                                <h2 className="about-badge-kind">{t('Club badges: earned by the club together')}</h2>
                                <p className="text-subtle fs-7 m-0">
                                    {t('Not a player\'s, but the club\'s: every game and training of its members adds to them. Each shows the game or training that tipped it and who made it happen, and the members hear about each new one. They add no XP. The club admins can also set up to three goals for the whole club under Edit club. The club\'s badges and goals are under')}{' '}<Link to="/badges#club">{t('Club → Badges')}</Link>.
                                </p>
                            </div>
                            <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                {clubSeries.map(badges => (
                                    <li key={badges[0].group} className="d-flex align-items-center gap-3">
                                        <ClubMedal badge={badges.at(-1)} size="sm" />
                                        <div className="d-flex flex-column min-w-0">
                                            <span className="text-default fs-7 fw-semibold">{badges[0].groupTitle}</span>
                                            <span className="text-faint fs-8">
                                                {badges.length === 1
                                                    ? `${badges[0].title}: ${badges[0].description}`
                                                    : badges.map(badge => `${badge.title} (${badge.targetLabel})`).join(' · ')}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    }
                </div>
            </Panel>
            }
        </div>
    );
};

export default AboutCard;
