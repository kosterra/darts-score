import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import QRCode from 'qrcode';

import ScreenService from '../../services/screen.service';
import { formatDateTime } from '../../utils/dates';
import { t } from '../../utils/i18n';

/**
 * "Big screen" in the header of a club game: sent to a TV by the code it
 * shows at /tv (the easy way, nothing to type there), or a link and its QR
 * code for a laptop or a second tablet. Either follows the game without
 * logging in; the link is made when the dialog opens and lasts some hours.
 */
const BigScreenButton = ({ kind = 'x01', gameId, create = null, send = null }) => {
    // a club game by its kind, or other ways of their own (a darts evening)
    const makeLink = create ?? (() => ScreenService.createScreenLink(kind, gameId));
    const sendCode = send ?? ((tvCode) => ScreenService.sendToTv(kind, gameId, tvCode));
    const [open, setOpen] = useState(false);
    const [link, setLink] = useState(null);
    const [qr, setQr] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [code, setCode] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState('');
    const [sendError, setSendError] = useState('');

    const sendToTv = async (event) => {
        event.preventDefault();
        setSending(true);
        setSendError('');
        setSent('');
        try {
            await sendCode(code);
            setSent(code);
        } catch (err) {
            setSendError(err.message);
        }
        setSending(false);
    };

    useEffect(() => {
        if (!open || link) return;
        makeLink()
            .then(answer => {
                const url = `${window.location.origin}/screen/${answer.token}`;
                setLink({ url, expiresAt: answer.expiresAt });
                QRCode.toDataURL(url, { margin: 1, width: 260 }).then(setQr).catch(() => setQr(''));
            })
            .catch(err => setError(err.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, link]);

    const copy = () => navigator.clipboard?.writeText(link.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});

    return (
        <>
            <button type="button" className="game-rules-toggle" onClick={() => setOpen(true)} title={t('Show the game on a TV or a second tablet')}>
                <i className="pi pi-desktop" aria-hidden="true" />
                <span className="game-rules-label">{t('Big screen')}</span>
            </button>
            <Dialog header={t('Big screen')} visible={open} onHide={() => setOpen(false)} className="big-screen-dialog" dismissableMask>
                <div className="d-flex flex-column gap-3">
                    <span className="text-default fw-semibold">{t('On a TV')}</span>
                    <span className="text-subtle fs-7">{t('Open {{address}} in the browser of the TV once: it shows a code. Enter it here and the TV shows the game large, live, without logging in. Keep scoring here.', { address: `${window.location.host}/tv` })}</span>
                    <form onSubmit={sendToTv} className="d-flex gap-2">
                        <InputText
                            value={code}
                            onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setSent(''); }}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="123 456"
                            aria-label={t('The code of the TV')}
                            className="flex-grow-1 min-w-0 big-screen-code-input"
                        />
                        <Button type="submit" label={t('Send')} icon="pi pi-send" disabled={code.length !== 6} loading={sending} />
                    </form>
                    {sent && <Message severity="success" text={t('Sent: the TV with the code {{code}} shows the game in a moment.', { code: sent })} className="w-100 justify-content-start" />}
                    {sendError && <Message severity="error" text={sendError} className="w-100 justify-content-start" />}

                    <span className="text-default fw-semibold mt-2">{t('On a laptop or a tablet')}</span>
                    <span className="text-subtle fs-7">{t('Open this link there, or scan the code: it shows the game large and follows it live, without logging in.')}</span>
                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    {link &&
                        <>
                            {qr && <img src={qr} alt={t('QR code of the link for the big screen')} className="big-screen-qr align-self-center" width="220" height="220" />}
                            <div className="d-flex gap-2">
                                <InputText value={link.url} readOnly className="flex-grow-1 min-w-0" aria-label={t('Link for the big screen')} onFocus={(event) => event.target.select()} />
                                <Button type="button" icon={copied ? 'pi pi-check' : 'pi pi-copy'} severity="secondary" outlined aria-label={t('Copy the link')} title={t('Copy the link')} onClick={copy} />
                            </div>
                            <span className="text-faint fs-8">{t('Anyone with this link sees the game, until {{date}}. On the big screen, a tap makes it full screen and switches the caller on.', { date: formatDateTime(link.expiresAt) })}</span>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="align-self-start fs-7">{t('Open it on this device')}</a>
                        </>}
                </div>
            </Dialog>
        </>
    );
};

export default BigScreenButton;
