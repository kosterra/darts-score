import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { FaGithub } from "react-icons/fa6";

import CHANGELOG from './changelog';
import RULES from './rules';
import BadgeMedal from '../badges/badge.medal';
import ShameMedal from '../badges/shame.medal';
import { requestJSON } from '../../utils/service.utils';

const REPOSITORY = 'https://github.com/kosterra/darts-score';

/**
 * What the app is, what is new, how the games work and which badges exist.
 */
const AboutCard = () => {
    const [catalogue, setCatalogue] = useState(null);

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

            <Panel header="What's new">
                <div className="d-flex flex-column gap-4 p-2">
                    {CHANGELOG.map(release => (
                        <section key={release.version}>
                            <h2 className="fs-5 fw-semibold text-default mb-2">{release.version}</h2>
                            <ul className="text-subtle m-0 ps-4 d-flex flex-column gap-1">
                                {release.changes.map(change => <li key={change}>{change}</li>)}
                            </ul>
                        </section>
                    ))}
                </div>
            </Panel>

            <Panel header="How to play">
                <div className="row g-3 p-1">
                    {RULES.map(({ title, icon: Icon, body }, index) => (
                        // entering darts applies to every game, so it spans the full width above the four game modes
                        <section key={title} className={index === 0 ? 'col-12' : 'col-12 col-lg-6'}>
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
            </Panel>

            <Panel header="Badges">
                <div className="d-flex flex-column gap-4 p-2">
                    <p className="text-subtle m-0">
                        Badges are earned automatically in games and trainings. Your own collection is under <Link to="/badges">Statistics → Badges</Link>.
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
                                Badges nobody wants. In every club one player holds each of them: whoever got it last, shown on the dashboard and next to their name during X01 games. They keep it until someone else gets it or until they wash it off with the good deed. These badges add no XP, and a club admin can switch them off in the club settings, e.g. for a club with children.
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
        </div>
    );
};

export default AboutCard;
