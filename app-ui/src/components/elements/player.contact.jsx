import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import QRCode from 'qrcode';

import PlayerService from '../../services/player.service';
import { CONTACT_TOPICS } from '../../rules/notifications';
import { LANGUAGES, currentLanguage, t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { Lines } from './skeletons';

const TOPIC_LABELS = {
    badges: t('Badges they earned'),
    level: t('A new level'),
    records: t('New personal bests and club records'),
    weeklySummary: t('Their week, on Mondays'),
};

/**
 * For a player without a login, on the page to edit them (club admins): the
 * address the club keeps for their mails, with their consent, and a link
 * (with a QR code) to take the player over with a login of their own.
 */
const PlayerContact = ({ player, club, onSaved, onError }) => {
    const [data, setData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ email: '', topics: CONTACT_TOPICS.map(topic => topic.id), language: currentLanguage(), consent: false });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [claim, setClaim] = useState(null);

    useEffect(() => {
        PlayerService.loadContact(player.id).then(setData).catch(() => setData({ contact: null, claims: { count: 0 }, mailEnabled: false }));
    }, [player.id]);

    if (!data) return <Lines count={3} />;
    const { contact } = data;

    const edit = () => {
        setForm({ email: contact?.email ?? '', topics: contact?.topics ?? CONTACT_TOPICS.map(topic => topic.id), language: contact?.language ?? currentLanguage(), consent: false });
        setError('');
        setEditing(true);
    };
    const toggleTopic = (id) => setForm(current => ({ ...current, topics: current.topics.includes(id) ? current.topics.filter(topic => topic !== id) : [...current.topics, id] }));
    const save = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            setData(await PlayerService.saveContact(player.id, form));
            setEditing(false);
            onSaved?.(t('Address saved'));
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };
    const forget = async () => {
        try {
            setData(await PlayerService.removeContact(player.id));
            onSaved?.(t('Address forgotten'));
        } catch (err) {
            onError?.(t('Not saved'), err);
        }
    };
    const createClaim = async () => {
        try {
            const created = await PlayerService.createClaim(player.id);
            const qr = await QRCode.toDataURL(created.link, { margin: 1, width: 320 });
            setClaim({ ...created, qr });
            setData(current => ({ ...current, claims: created.claims }));
        } catch (err) {
            onError?.(t('No link'), err);
        }
    };
    const revoke = async () => {
        try {
            const { claims } = await PlayerService.revokeClaims(player.id);
            setClaim(null);
            setData(current => ({ ...current, claims }));
            onSaved?.(t('The links stopped working'));
        } catch (err) {
            onError?.(t('Not saved'), err);
        }
    };
    const copy = () => navigator.clipboard?.writeText(claim.link).then(() => onSaved?.(t('Link copied'))).catch(() => {});
    // a page to print: the QR code with what to do
    const print = () => {
        const page = window.open('', '_blank', 'width=480,height=640');
        if (!page) return;
        const escape = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
        page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(player.nickname)}</title></head>
<body style="font-family:Helvetica,Arial,sans-serif;text-align:center;padding:24px;color:#222">
<h2 style="margin:0 0 8px">${escape(player.nickname)}</h2>
<p style="margin:0 0 16px">${escape(t('Your own login for {{club}}', { club: club?.name ?? '' }))}</p>
<img src="${claim.qr}" alt="" style="width:240px;height:240px">
<p style="margin:16px 0 4px">${escape(t('Scan the code to see your statistics, badges and level any time.'))}</p>
<p style="font-size:11px;color:#666;word-break:break-all">${escape(claim.link)}</p>
<p style="font-size:11px;color:#666">${escape(t('Valid until {{date}}', { date: formatDate(claim.expiresAt) }))}</p>
</body></html>`);
        page.document.close();
        page.focus();
        page.print();
    };

    return (
        <div className="d-flex flex-column gap-4">
            {/* the address for their mails */}
            <div className="d-flex flex-column gap-3">
                {!data.mailEnabled && <span className="text-faint fs-8">{t('This installation sends no mails at the moment: the address is kept for when an admin sets them up.')}</span>}
                {!contact && !editing &&
                    <>
                        <span className="fs-7 text-subtle">
                            {t('{{nickname}} has no login, but can still get their news by mail: badges, a new level and records once a day, their week on Mondays. The address is only for these mails and never shown to other players.', { nickname: player.nickname })}
                        </span>
                        <div className="d-flex justify-content-end">
                            <Button type="button" label={t('Add an address')} icon="pi pi-envelope" size="small" severity="secondary" onClick={edit} />
                        </div>
                    </>}
                {contact && !editing &&
                    <>
                        <span className="text-default">
                            {t('Mails go to')}{' '}<span className="fw-semibold text-break">{contact.email}</span>
                            {': '}{contact.topics.map(topic => TOPIC_LABELS[topic]).filter(Boolean).join(', ') || t('none chosen')}
                        </span>
                        <span className="text-faint fs-8">{t('Agreed on {{date}}, confirmed by {{name}}.', { date: formatDate(contact.consentAt), name: contact.consentByName || '–' })}</span>
                        {contact.unsubscribedAt && <Message severity="warn" text={t('{{nickname}} asked for no more mails on {{date}}. Save the address again only once they agree again.', { nickname: player.nickname, date: formatDate(contact.unsubscribedAt) })} className="w-100 justify-content-start" />}
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                            <Button type="button" label={t('Forget the address')} icon="pi pi-trash" size="small" severity="danger" text onClick={forget} />
                            <Button type="button" label={t('Change')} icon="pi pi-pencil" size="small" severity="secondary" onClick={edit} />
                        </div>
                    </>}
                {editing &&
                    <form onSubmit={save} className="d-flex flex-column gap-3">
                        <InputText type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('Email')} aria-label={t('Email')} required />
                        <div className="d-flex flex-column gap-2" role="group" aria-label={t('Which mails')}>
                            {CONTACT_TOPICS.map(topic => (
                                <label key={topic.id} className="d-flex align-items-center gap-2" htmlFor={`contact-${player.id}-${topic.id}`}>
                                    <Checkbox inputId={`contact-${player.id}-${topic.id}`} checked={form.topics.includes(topic.id)} onChange={() => toggleTopic(topic.id)} />
                                    <span>{TOPIC_LABELS[topic.id]}</span>
                                </label>
                            ))}
                        </div>
                        <Dropdown value={form.language} options={LANGUAGES} optionLabel="label" optionValue="code" onChange={(e) => setForm({ ...form, language: e.value })} aria-label={t('Language of the mails')} />
                        <label className="d-flex align-items-start gap-2" htmlFor={`contact-${player.id}-consent`}>
                            <Checkbox inputId={`contact-${player.id}-consent`} checked={form.consent} onChange={(e) => setForm({ ...form, consent: Boolean(e.checked) })} />
                            <span className="fs-7">{t('{{nickname}} agreed to get these mails at this address. Every mail has a link to get no more.', { nickname: player.nickname })}</span>
                        </label>
                        {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                        <div className="d-flex justify-content-end gap-2">
                            <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={() => setEditing(false)} />
                            <Button type="submit" label={t('Save')} icon="pi pi-save" size="small" loading={busy} disabled={!form.consent || !form.email} />
                        </div>
                    </form>}
            </div>

            {/* a login of their own, with a link */}
            <div className="d-flex flex-column gap-3">
                <p className="setting-title m-0">{t('A login of their own, with a link')}</p>
                <span className="fs-7 text-subtle">
                    {t('With the link {{nickname}} creates a login, or logs in, and takes over this player with all games, statistics and badges. Show the QR code at the club night, print it or pass the link on. It works for 30 days.', { nickname: player.nickname })}
                </span>
                {claim &&
                    <div className="claim-link">
                        <img src={claim.qr} alt={t('QR code of the link')} className="claim-link-qr" />
                        <div className="claim-link-text">
                            <span className="fs-8 text-subtle">{claim.link}</span>
                            <span className="text-faint fs-8">{t('Valid until {{date}}', { date: formatDate(claim.expiresAt) })}</span>
                            <div className="d-flex gap-2 flex-wrap">
                                <Button type="button" label={t('Copy link')} icon="pi pi-copy" size="small" severity="secondary" onClick={copy} />
                                <Button type="button" label={t('Print')} icon="pi pi-print" size="small" severity="secondary" onClick={print} />
                            </div>
                        </div>
                    </div>}
                {data.claims?.count > 0 && <span className="text-faint fs-8">{t('Open links: {{count}}, the last works until {{date}}.', { count: data.claims.count, date: formatDate(data.claims.until) })}</span>}
                <div className="d-flex justify-content-end gap-2 flex-wrap">
                    {data.claims?.count > 0 && <Button type="button" label={t('Stop all links')} icon="pi pi-ban" size="small" severity="danger" text onClick={revoke} />}
                    <Button type="button" label={claim ? t('A new link') : t('Create a link')} icon="pi pi-qrcode" size="small" severity="secondary" onClick={createClaim} />
                </div>
            </div>
        </div>
    );
};

export default PlayerContact;
