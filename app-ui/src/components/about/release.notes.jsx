import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

import CHANGELOG from './changelog';
import { t, tn } from '../../utils/i18n';

// the newest releases shown at first
const RECENT_RELEASES = 4;
// a topic in front of a change ("Fair play: ..."), short enough to read as its title
const TOPIC = /^([^:.]{2,60}):\s+/;

// a change split into what it is about and what changed; fixes marked as such
const describe = (text) => {
    const fix = text.startsWith(t('Fix: '));
    const rest = fix ? text.slice(5) : text;
    const topic = rest.match(TOPIC);
    const body = topic ? rest.slice(topic[0].length) : rest;
    // a fix reads as a sentence of its own without its "Fix:"
    return { fix, topic: topic?.[1] ?? null, text: fix && !topic ? body.charAt(0).toUpperCase() + body.slice(1) : body };
};

const Change = ({ change }) => {
    const { fix, topic, text } = describe(change);
    return (
        <li className="release-change">
            <Tag value={fix ? t('Fix') : t('New')} severity={fix ? 'warning' : 'success'} className="release-change-kind" />
            <span className="fs-7 text-subtle">
                {topic && <strong className="text-default fw-semibold">{topic}: </strong>}
                {text}
            </span>
        </li>
    );
};

/**
 * What is new, version by version: each a card with its changes, the newest
 * open, the others folded with how many changes they bring. Each change is
 * marked as new or a fix, its topic in front.
 */
const ReleaseNotes = () => {
    const [allReleases, setAllReleases] = useState(false);
    const [open, setOpen] = useState(() => new Set([CHANGELOG[0]?.version]));
    const toggle = (version) => setOpen(current => {
        const next = new Set(current);
        if (next.has(version)) next.delete(version);
        else next.add(version);
        return next;
    });
    const shown = allReleases ? CHANGELOG : CHANGELOG.slice(0, RECENT_RELEASES);

    return (
        <div className="d-flex flex-column gap-3 p-1">
            {shown.map((release, index) => {
                const isOpen = open.has(release.version);
                const fixes = release.changes.filter(change => change.startsWith(t('Fix: '))).length;
                const id = `release-${release.version.replaceAll('.', '-')}`;
                return (
                    <section key={release.version} className={`release ${isOpen ? 'is-open' : ''}`}>
                        <button type="button" className="release-head" aria-expanded={isOpen} aria-controls={id} onClick={() => toggle(release.version)}>
                            <span className="release-version">{release.version}</span>
                            {index === 0 && <Tag value="Latest" />}
                            <span className="text-faint fs-8 me-auto">
                                {tn(release.changes.length - fixes, '{{count}} new', '{{count}} new')}{fixes ? ` · ${tn(fixes, '{{count}} fix', '{{count}} fixes')}` : ''}
                            </span>
                            <i className={`pi ${isOpen ? 'pi-chevron-up' : 'pi-chevron-down'} text-subtle`} aria-hidden="true" />
                        </button>
                        {isOpen && (
                            <ul id={id} className="release-changes list-unstyled m-0">
                                {release.changes.map(change => <Change key={change} change={change} />)}
                            </ul>
                        )}
                    </section>
                );
            })}
            {CHANGELOG.length > RECENT_RELEASES &&
                <Button
                    type="button"
                    label={allReleases ? t('Only the latest versions') : t('Show all {{length}} versions', { length: CHANGELOG.length })}
                    icon={`pi ${allReleases ? 'pi-chevron-up' : 'pi-chevron-down'}`}
                    size="small"
                    severity="secondary"
                    className="align-self-start"
                    onClick={() => setAllReleases(value => !value)}
                />
            }
        </div>
    );
};

export default ReleaseNotes;
