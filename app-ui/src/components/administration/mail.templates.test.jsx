import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import AdminService from '../../services/admin.service';
import MailTemplates from './mail.templates';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const template = (id, subject) => ({
    id, title: id, description: '', customized: false, placeholders: [],
    current: { subject, body: 'Hello', button: 'Open' },
});

// types into a field the way React hears it
const type = (field, value) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set;
    setter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('the mail templates', () => {
    let container;
    let root;
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(AdminService, 'loadMailTemplates').mockResolvedValue({
            language: 'en', mailEnabled: true, limits: { subject: 200, body: 5000, button: 50 },
            templates: [template('passwordReset', 'Reset'), template('invitation', 'Welcome')],
        });
        vi.spyOn(AdminService, 'previewMailTemplate').mockResolvedValue({ subject: '', html: '' });
        vi.spyOn(AdminService, 'saveMailTemplate').mockImplementation((id, draft) => Promise.resolve({ current: draft, customized: true }));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('saves the text a moment after typing, without a Save button', async () => {
        await act(async () => root.render(<MailTemplates />));
        const subject = container.querySelector('input.p-inputtext:not([type=email])');
        expect(subject.value).toBe('Reset');
        act(() => type(subject, 'Reset your password'));
        expect(AdminService.saveMailTemplate).not.toHaveBeenCalled();
        await act(async () => vi.advanceTimersByTime(700));
        expect(AdminService.saveMailTemplate).toHaveBeenCalledWith('passwordReset', expect.objectContaining({ subject: 'Reset your password' }), 'en');
        expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Save')).toBe(false);
    });

    it('saves what was typed at once when the field is left (as before another mail is picked)', async () => {
        await act(async () => root.render(<MailTemplates />));
        const subject = container.querySelector('input.p-inputtext:not([type=email])');
        act(() => type(subject, 'Reset it'));
        await act(async () => subject.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
        // to its own mail, before the moment after typing is over
        expect(AdminService.saveMailTemplate).toHaveBeenCalledTimes(1);
        expect(AdminService.saveMailTemplate).toHaveBeenCalledWith('passwordReset', expect.objectContaining({ subject: 'Reset it' }), 'en');
    });
});
