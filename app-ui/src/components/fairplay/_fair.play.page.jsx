import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import dayjs from 'dayjs';

import IntegrityService, { announceFairPlayChange } from '../../services/integrity.service';
import ClubLogo from '../elements/club.logo';
import { ClubFilter } from '../admin/club.filter';
import PageLoader from '../elements/page.loader';
import DeletePopup from '../elements/delete.popup';
import { useAuth } from '../../utils/auth.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const LEVEL_LABELS = { impossible: 'Impossible', suspicious: 'Suspicious' };

// which list an entry is on: impossible ones until deleted, the others by their review
const listOf = (entry) => entry.level === 'impossible' ? 'impossible' : entry.review?.status === 'ok' ? 'fine' : entry.review?.status === 'watch' ? 'watch' : 'suspicious';

/**
 * Fair play: games and trainings that cannot be real (to be deleted) or are
 * worth a look (suspicious: kept on the watch list or marked as fine). For the
 * admins of the selected club, or with "all" for global admins over every club.
 */
const FairPlayPage = ({ all = false }) => {
    const { activeClub } = useAuth();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [list, setList] = useState(null);
    const [busy, setBusy] = useState(null);
    // global admins: the clubs shown, none chosen means all
    const [clubFilter, setClubFilter] = useState([]);

    const load = () => IntegrityService.loadFindings(all).then(setData).catch(() => setFailed(true));
    useEffect(() => { load(); }, [all]);

    // the clubs with findings, for the filter
    const clubs = useMemo(() => {
        const byId = new Map((data?.entries ?? []).map(entry => [entry.club.id, entry.club]));
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);
    const inFilter = (entry) => !all || !clubFilter.length || clubFilter.includes(entry.club.id);

    const counts = useMemo(() => {
        const result = { impossible: 0, suspicious: 0, watch: 0, fine: 0 };
        (data?.entries ?? []).filter(inFilter).forEach(entry => { result[listOf(entry)] += 1; });
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, clubFilter, all]);
    // the list to start with: what needs doing first
    const shown = list ?? (counts.impossible ? 'impossible' : counts.suspicious ? 'suspicious' : counts.watch ? 'watch' : 'suspicious');

    if (failed) return <div className="container-fluid p-4 text-subtle">The games could not be checked. Please reload the page.</div>;
    if (!data) return <PageLoader />;

    const options = [
        { label: `Impossible · ${counts.impossible}`, value: 'impossible' },
        { label: `Suspicious · ${counts.suspicious}`, value: 'suspicious' },
        { label: `Watched · ${counts.watch}`, value: 'watch' },
        { label: `Looks fine · ${counts.fine}`, value: 'fine' },
    ];
    const entries = data.entries.filter(entry => inFilter(entry) && listOf(entry) === shown);

    const setReview = async (entry, status) => {
        setBusy(entry.id);
        try {
            const review = await IntegrityService.review(entry.type, entry.id, status);
            setData(current => ({ ...current, entries: current.entries.map(item => item.id === entry.id ? { ...item, review } : item) }));
            announceFairPlayChange();
        } finally {
            setBusy(null);
        }
    };
    // every entry of the list shown (and the clubs chosen) at once
    const removeAll = async () => {
        const items = entries.map(entry => ({ type: entry.type, id: entry.id }));
        setBusy('all');
        try {
            await IntegrityService.removeMany(items);
        } finally {
            setBusy(null);
            announceFairPlayChange();
            load();
        }
    };
    const remove = async (entry) => {
        setBusy(entry.id);
        try {
            await IntegrityService.remove(entry.type, entry.id);
            setData(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }));
            announceFairPlayChange();
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={all ? 'Fair play · all clubs' : 'Fair play'}>
                <p className="text-subtle fs-7 mt-0 mb-3" style={{ maxWidth: '75ch' }}>
                    Games and trainings checked for what cannot be real or is far out of the ordinary.
                    <strong className="text-default"> Impossible</strong> ones (e.g. Around the Clock in a few seconds, a visit that does not match its darts) cannot come from a real game: delete them, with the badges earned in them.
                    <strong className="text-default"> Suspicious</strong> ones are possible but worth a look (e.g. a world-class time, an opponent who never threw): mark them as fine, or keep them on the watch list.
                </p>
                <div className="fair-play-filters">
                    <SelectButton value={shown} options={options} onChange={(e) => e.value && setList(e.value)} className="p-selectbutton-pills pills-inline flex-wrap" aria-label="List" />
                    {shown === 'impossible' && entries.length > 1 &&
                        <DeletePopup
                            data={entries}
                            header="Delete all for fair play"
                            message={`all ${entries.length} games and trainings that cannot be real${all && clubFilter.length ? ' of the chosen clubs' : ''}, with the badges earned in them`}
                            handleDelete={removeAll}
                            label={busy === 'all' ? 'Deleting…' : `Delete all ${entries.length}`}
                            size="small"
                        />
                    }
                    {all && clubs.length > 0 &&
                        <ClubFilter clubs={clubs} selectedIds={clubFilter} onChange={(ids) => setClubFilter(ids ?? [])} optional />
                    }
                </div>

                {entries.length === 0
                    ? <p className="text-faint fs-7 py-4 text-center m-0">{shown === 'impossible' ? 'Nothing impossible: no data that cannot be real.' : 'Nothing here.'}</p>
                    : (
                        <ul className="fair-play-list list-unstyled m-0">
                            {entries.map(entry => {
                                const viewable = entry.type !== 'training' && (!all || entry.club.id === activeClub?.id);
                                return (
                                    <li key={`${entry.type}-${entry.id}`} className={`fair-play-entry is-${entry.level}`}>
                                        {/* across all clubs: whose club it is comes first */}
                                        {all &&
                                            <div className="fair-play-club">
                                                <ClubLogo club={entry.club} size="sm" />
                                                <span className="text-default fw-semibold">{entry.club.name || 'Unknown club'}</span>
                                            </div>
                                        }
                                        <div className="fair-play-head">
                                            <span className={`fair-play-level is-${entry.level}`}>{LEVEL_LABELS[entry.level]}</span>
                                            <span className="text-default fw-semibold">{entry.summary}</span>
                                            <span className="text-faint fs-8">{dayjs(entry.at).format('DD.MM.YYYY HH:mm')}</span>
                                        </div>
                                        <div className="fair-play-players">
                                            {entry.players.map(player => (
                                                <span key={player.id} className="d-inline-flex align-items-center gap-2">
                                                    <Avatar
                                                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                                        image={resolvePlayerImg(player.profileImg)}
                                                        shape="circle"
                                                        className="avatar-xs bg-surface-high"
                                                    />
                                                    <span className="text-subtle fs-8">{player.nickname}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <ul className="fair-play-findings list-unstyled m-0">
                                            {entry.findings.map((item, index) => (
                                                <li key={index} className={`is-${item.level}`}>
                                                    <span className="fw-semibold">{item.title}</span>
                                                    {item.playerId && entry.players.length > 1 && <span className="text-faint"> · {entry.players.find(player => player.id === item.playerId)?.nickname}</span>}
                                                    <span className="text-faint"> · {item.detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {entry.review && <span className="text-faint fs-8">{entry.review.status === 'ok' ? 'Marked as fine' : 'Kept on the watch list'} by {entry.review.byName}, {dayjs(entry.review.at).format('DD.MM.YYYY')}</span>}
                                        <div className="fair-play-actions">
                                            {viewable && <Link to={`/stats/games/${entry.type}/${entry.id}`} className="p-button p-button-sm p-button-secondary">View</Link>}
                                            {entry.level === 'suspicious' && entry.review?.status !== 'ok' &&
                                                <Button type="button" label="Looks fine" icon="pi pi-check" size="small" outlined disabled={busy === entry.id} onClick={() => setReview(entry, 'ok')} />}
                                            {entry.level === 'suspicious' && entry.review?.status !== 'watch' &&
                                                <Button type="button" label="Watch" icon="pi pi-eye" size="small" severity="secondary" disabled={busy === entry.id} onClick={() => setReview(entry, 'watch')} />}
                                            <DeletePopup
                                                data={entry}
                                                header="Delete for fair play"
                                                message={`this ${entry.type === 'training' ? 'training' : 'game'} (${entry.summary}) and the badges earned in it`}
                                                handleDelete={() => remove(entry)}
                                                label="Delete"
                                                size="small"
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                }
            </Panel>
        </div>
    );
};

export default FairPlayPage;
