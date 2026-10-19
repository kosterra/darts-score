import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { FaGithub } from "react-icons/fa6";

import CHANGELOG from './changelog';
import RULES from './rules';
import { PLAYER_GUIDE, ADMIN_GUIDE } from './guides';
import LevelsSection from './levels.section';
import BadgeMedal from '../badges/badge.medal';
import ShameMedal from '../badges/shame.medal';
import { requestJSON } from '../../utils/service.utils';

const REPOSITORY = 'https://github.com/kosterra/darts-score';

// the parts of the page, each with its own address (/about#levels)
const SECTIONS = [
    { value: 'news', label: "What's new" },
    { value: 'rules', label: 'How to play' },
    { value: 'levels', label: 'Levels' },
    { value: 'badges', label: 'Badges' },
    { value: 'players', label: 'Player guide' },
    { value: 'admins', label: 'Club admin guide' },
];

// the newest releases shown at first
const RECENT_RELEASES = 4;

// topics of a guide or the rules: cards, the first one across the full width
const Topics = ({ topics, firstWide = false }) => (
    <div className="row g-3 p-1">
        {topics.map(({ title, icon: Icon, body }, index) => (
            <section key={title} className={firstWide && index === 0 ? 'col-12' : 'col-12 col-lg-6'}>
                <div className="about-rule bg-surface-raised rounded-2 p-4 h-100">
                    <h2 className="d-flex align-items-center gap-3 fs-5 fw-semibold text-default mb-3">
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
    const [allReleases, setAllReleases] = useState(false);
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

    return (
        <div className="d-flex flex-column gap-4 mx-auto" style={{ maxWidth: '62rem' }}>
            <header className="hero-header rounded-2 p-4 d-flex flex-wrap align-items-center gap-4">
                <img alt="" src="/logo.svg" width="80" height="80" />
                <div className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                    <h1 className="fs-2 fw-semibold text-default m-0">Oche</h1>
                    <span className="text-subtle">The scoreboard for your club, your pub team or your living room.</span>
                    <span className="text-faint fs-7">Version {import.meta.env.VITE_APP_VERSION} · open source under the GPLv3</span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <a href={REPOSITORY} target="_blank" rel="noopener noreferrer" className="p-button p-button-sm p-button-outlined">
                        <FaGithub className="me-2" aria-hidden="true" />Source code
                    </a>
                    <a href={`${REPOSITORY}/issues`} target="_blank" rel="noopener noreferrer" className="p-button p-button-sm">
                        <i className="pi pi-comment me-2" aria-hidden="true" />Report a problem or idea
                    </a>
                </div>
            </header>

            <SelectButton
                value={section}
                options={SECTIONS}
                onChange={(event) => event.value && navigate({ hash: event.value === 'news' ? '' : event.value }, { replace: true })}
                className="p-selectbutton-pills pills-inline flex-wrap"
                aria-label="Part of the page"
            />

            {section === 'news' &&
                <Panel header="What's new">
                    <div className="d-flex flex-column gap-4 p-2">
                        {(allReleases ? CHANGELOG : CHANGELOG.slice(0, RECENT_RELEASES)).map(release => (
                            <section key={release.version}>
                                <h2 className="fs-5 fw-semibold text-default mb-2">{release.version}</h2>
                                <ul className="text-subtle m-0 ps-4 d-flex flex-column gap-1">
                                    {release.changes.map(change => <li key={change}>{change}</li>)}
                                </ul>
                            </section>
                        ))}
                        {CHANGELOG.length > RECENT_RELEASES &&
                            <Button
                                type="button"
                                label={allReleases ? 'Only the latest versions' : `Show all ${CHANGELOG.length} versions`}
                                icon={`pi ${allReleases ? 'pi-chevron-up' : 'pi-chevron-down'}`}
                                size="small"
                                severity="secondary"
                                className="align-self-start"
                                onClick={() => setAllReleases(value => !value)}
                            />
                        }
                    </div>
                </Panel>
            }

            {section === 'rules' &&
                <Panel header="How to play">
                    {/* entering darts applies to every game, so it spans the full width above the four game modes */}
                    <Topics topics={RULES} firstWide />
                </Panel>
            }

            {section === 'levels' &&
                <Panel header="Levels">
                    <LevelsSection levels={catalogue?.levels} rules={catalogue?.xpRules} />
                </Panel>
            }

            {section === 'players' &&
                <Panel header="Player guide">
                    <Topics topics={PLAYER_GUIDE} />
                </Panel>
            }

            {section === 'admins' &&
                <Panel header="Club admin guide">
                    <p className="text-subtle fs-7 px-2 pt-2 mb-2">Everything a club admin looks after, besides playing. Admins see and can do everything in their club; players see it too, but only admins change it.</p>
                    <Topics topics={ADMIN_GUIDE} />
                </Panel>
            }

            {section === 'badges' &&
            <Panel header="Badges">
                <div className="d-flex flex-column gap-4 p-2">
                    <p className="text-subtle m-0">
                        Badges are earned automatically in games and trainings. Your own collection is on your profile and under <Link to="/badges">Club → Badges</Link>.
                    </p>
                    {!catalogue && <span className="text-faint">Loading badges…</span>}
                    {categories.map(category => (
                        <section key={category.category} className="d-flex flex-column gap-3">
                            <h2 className="fs-5 fw-semibold text-default m-0">{category.title}</h2>
                            <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                {category.series.map(badges => (
                                    <li key={badges[0].group} className="d-flex align-items-center gap-3">
                                        <BadgeMedal badge={badges.at(-1)} size="sm" />
                                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                            <span className="text-default fw-semibold">{badges[0].groupTitle}</span>
                                            <span className="text-faint fs-7">
                                                {badges.length === 1
                                                    ? badges[0].description
                                                    : badges.map(badge => `${badge.title} (${badge.targetLabel ?? new Intl.NumberFormat().format(badge.target)})`).join(' · ')}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    {catalogue?.shame?.length > 0 &&
                        <section className="d-flex flex-column gap-3">
                            <h2 className="fs-5 fw-semibold text-default m-0">Hall of Shame</h2>
                            <p className="text-subtle fs-7 m-0">
                                Badges nobody wants. In every club one player holds each of them: whoever got it last, shown on the dashboard and next to their name during X01 games. They keep it until someone else gets it or until they wash it off with the good deed. These badges add no XP. A club admin can switch them off in the club settings, or keep them and leave children out (under 16, or another age the club chooses).
                            </p>
                            <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                {catalogue.shame.map(badge => (
                                    <li key={badge.id} className="d-flex align-items-center gap-3">
                                        <ShameMedal badge={badge} size="sm" />
                                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                            <span className="text-default fw-semibold">{badge.title}</span>
                                            <span className="text-faint fs-7">{badge.description} · Wash it off: {badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1)}</span>
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
