import { Button } from 'primereact/button';

import { t } from '../../utils/i18n';

/**
 * The recovery codes, shown once: to copy, download or print and keep in a
 * safe place. Each one logs in once instead of a code of the app.
 */
const RecoveryCodes = ({ codes, email, onSaved }) => {
    const text = `${t('Recovery codes for Legmate')}${email ? ` (${email})` : ''}\n\n${codes.join('\n')}\n\n${t('Each code works once, instead of a code of your authenticator app.')}\n`;
    const copy = () => navigator.clipboard?.writeText(text).then(() => onSaved?.(t('Codes copied'))).catch(() => {});
    const download = () => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        link.download = 'oche-recovery-codes.txt';
        link.click();
        URL.revokeObjectURL(link.href);
    };
    const print = () => {
        const page = window.open('', '_blank', 'width=480,height=640');
        if (!page) return;
        page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Legmate</title></head><body style="font-family:Helvetica,Arial,sans-serif;padding:24px"><pre style="font-size:16px;line-height:1.6">${text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])}</pre></body></html>`);
        page.document.close();
        page.focus();
        page.print();
    };

    return (
        <div className="d-flex flex-column gap-3">
            <span className="fs-7 text-subtle">{t('Keep these recovery codes in a safe place, e.g. printed or in your password manager. If your phone is lost, each one logs you in once. They are shown only now.')}</span>
            <ul className="recovery-codes list-unstyled m-0" aria-label={t('Recovery codes')}>
                {codes.map(code => <li key={code}>{code}</li>)}
            </ul>
            <div className="d-flex flex-wrap gap-2">
                <Button type="button" label={t('Copy')} icon="pi pi-copy" size="small" severity="secondary" onClick={copy} />
                <Button type="button" label={t('Download')} icon="pi pi-download" size="small" severity="secondary" onClick={download} />
                <Button type="button" label={t('Print')} icon="pi pi-print" size="small" severity="secondary" onClick={print} />
            </div>
        </div>
    );
};

export default RecoveryCodes;
