import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

import { useAuth } from '../../utils/auth.context';
import { locale, t } from '../../utils/i18n';
import { PageHeader, PublicFooter } from '../landing/public.frame';
import { ALL_TERMS, TERM_GROUPS } from './darts.terms';
import usePageTitle from '../../utils/use.page.title';

// the board as it hangs, in figures
const SETUP = [
    { metres: 1.73, text: t('From the floor to the centre of the bull') },
    { metres: 2.37, text: t('From the face of the board to the oche (steel tip)') },
    { metres: 2.93, text: t('From the bull to the oche, diagonally: to check both at once') },
    { count: 3, text: t('Darts per visit, thrown one after the other') },
];
// a length as the language writes it: 1.73 m, 1,73 m
const metresOf = (value) => `${new Intl.NumberFormat(locale(), { minimumFractionDigits: 2 }).format(value)} m`;

// a game of 501, from the first dart to the last
const STEPS = [
    { title: t('Start at 501'), text: t('Every player starts with 501 points (or 301 for a shorter game) and counts down to zero.') },
    { title: t('Three darts per visit'), text: t('You throw three darts; what they score is taken off your points. Then it is the next player\'s turn.') },
    { title: t('Finish on a double'), text: t('The last dart must hit a double (or the bullseye) and bring you exactly to zero. 40 left: double 20.') },
    { title: t('Too much is a bust'), text: t('More than you have left, or 1 left: the visit counts nothing and you keep your score from before it.') },
    { title: t('Legs and sets'), text: t('Zero first wins the leg; the start goes in turn. The legs (or sets) agreed on, e.g. best of 5, win the match.') },
];

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * One term: its name (and other names), what it means, and its own link.
 */
const TermCard = ({ term, target }) => (
    <article id={term.id} className={`term-card${target ? ' is-target' : ''}`}>
        <h3 className="term-name m-0">
            {term.term}
            <a href={`#${term.id}`} className="term-anchor" aria-label={t('Link to {{term}}', { term: term.term })}><i className="pi pi-link" aria-hidden="true" /></a>
        </h3>
        {term.aka?.length > 0 && <span className="text-faint fs-8">{t('Also: {{names}}', { names: term.aka.join(', ') })}</span>}
        <p className="text-subtle fs-7 m-0">{term.text}</p>
    </article>
);

/**
 * Darts A–Z, for everyone: how the board hangs, a game of 501 in
 * five steps, and the terms of darts explained, grouped and searchable, each
 * with a link of its own. The terms stay English, as in the app.
 */
const DartsTermsPage = () => {
    usePageTitle(t('Darts A–Z'));
    const { user } = useAuth();
    const { hash } = useLocation();
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState('all');
    // the term a link leads to, marked (:target misses a page drawn after the link)
    const target = hash ? decodeURIComponent(hash.slice(1)) : null;

    // a link to a term: every term shown again, and there once the page is laid out
    useEffect(() => {
        if (!hash) return undefined;
        setQuery('');
        setGroup('all');
        const id = decodeURIComponent(hash.slice(1));
        const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }), 50);
        return () => window.clearTimeout(timer);
    }, [hash]);

    const found = useMemo(() => {
        const words = normalize(query.trim());
        if (!words) return null;
        return ALL_TERMS.filter(term => normalize([term.term, ...(term.aka ?? []), term.text].join(' ')).includes(words));
    }, [query]);

    const groups = TERM_GROUPS.filter(entry => group === 'all' || entry.id === group);

    return (
        <div className="terms-page">
            <PageHeader user={user} />
            <main className="container terms-main">
                <section className="terms-hero">
                    <span className="landing-eyebrow">{t('Darts A–Z')}</span>
                    <h1 className="landing-title m-0">{t('Speak darts')}</h1>
                    <p className="terms-lead m-0">{t('New to darts, or wondering what a Madhouse is? How the board hangs, how a game goes, and the terms you hear at the oche. The terms stay English in every language, as in Oche.')}</p>
                </section>

                <section className="d-flex flex-column gap-3" aria-labelledby="terms-setup">
                    <h2 id="terms-setup" className="landing-heading m-0">{t('The setup')}</h2>
                    <div className="terms-setup">
                        {SETUP.map(item => (
                            <div key={item.text} className="terms-figure">
                                <span className="terms-figure-value">{item.metres ? metresOf(item.metres) : item.count}</span>
                                <span className="text-subtle fs-7">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="d-flex flex-column gap-3" aria-labelledby="terms-501">
                    <h2 id="terms-501" className="landing-heading m-0">{t('A game of 501 in five steps')}</h2>
                    <ol className="terms-steps">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="landing-step">
                                <span className="landing-step-number" aria-hidden="true">{index + 1}</span>
                                <div className="d-flex flex-column gap-1">
                                    <h3 className="fs-6 fw-semibold text-default m-0">{step.title}</h3>
                                    <p className="text-subtle fs-7 m-0">{step.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="d-flex flex-column gap-3" aria-labelledby="terms-glossary">
                    <h2 id="terms-glossary" className="landing-heading m-0">{t('From the oche to the Madhouse')}</h2>
                    <div className="terms-filter">
                        <span className="p-input-icon-left terms-search">
                            <i className="pi pi-search" aria-hidden="true" />
                            <InputText value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search a term')} aria-label={t('Search a term')} className="w-100" />
                        </span>
                        {!found &&
                            <div className="terms-groups" role="group" aria-label={t('Groups')}>
                                {[{ id: 'all', title: t('All') }, ...TERM_GROUPS].map(entry => (
                                    <button key={entry.id} type="button" className={`terms-group-pill ${group === entry.id ? 'is-chosen' : ''}`} aria-pressed={group === entry.id} onClick={() => setGroup(entry.id)}>
                                        {entry.title}
                                    </button>
                                ))}
                            </div>}
                    </div>

                    {found
                        ? (found.length
                            ? <div className="terms-grid">{found.map(term => <TermCard key={term.id} term={term} target={term.id === target} />)}</div>
                            : <p className="text-subtle m-0">{t('No term found. Try another word.')}</p>)
                        : groups.map(entry => (
                            <div key={entry.id} className="d-flex flex-column gap-3">
                                <h3 className="game-setup-section-title m-0">{entry.title}</h3>
                                <div className="terms-grid">{entry.terms.map(term => <TermCard key={term.id} term={term} target={term.id === target} />)}</div>
                            </div>
                        ))}
                </section>

                <section className="landing-cta terms-cta">
                    <h2 className="landing-heading m-0">{t('Ready for the oche?')}</h2>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <Link to="/quick"><Button label={t('Play a quick game')} icon="pi pi-play" /></Link>
                        <Link to="/evening/new"><Button label={t('Start a darts evening')} icon="pi pi-users" outlined /></Link>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
};

export default DartsTermsPage;
