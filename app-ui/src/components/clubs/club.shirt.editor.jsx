import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import ClubService from '../../services/club.service';
import { ShirtPicture } from '../shirts/shirt.art';
import { Swatches } from '../shirts/shirt.chooser';
import { t } from '../../utils/i18n';

const PATTERNS = [
    { value: 'plain', label: t('Plain') },
    { value: 'stripes', label: t('Side stripes') },
    { value: 'vertical', label: t('Stripes') },
    { value: 'hoops', label: t('Hoops') },
    { value: 'halves', label: t('Halves') },
    { value: 'sash', label: t('Sash') },
    { value: 'chevrons', label: t('Chevrons') },
];
const DEFAULT = { pattern: 'plain', color: null, accent: '#f2f2f2', logo: false };

/**
 * The club shirt its members play in, as its admins design it: a pattern,
 * the main colour (the club colour, or one of the shirt colours), a second
 * colour and the club's logo on the chest, with the shirt as it looks.
 * Players from the level Pro on may still wear a shirt of their own.
 */
const ClubShirtEditor = ({ club, onSaved, onError }) => {
    const [shirt, setShirt] = useState({ ...DEFAULT, ...(club.shirt ?? {}) });
    const [saving, setSaving] = useState(false);
    useEffect(() => setShirt({ ...DEFAULT, ...(club.shirt ?? {}) }), [club.shirt]);
    const set = (changes) => setShirt(current => ({ ...current, ...changes }));
    const changed = JSON.stringify(shirt) !== JSON.stringify({ ...DEFAULT, ...(club.shirt ?? {}) });

    const save = async () => {
        setSaving(true);
        try {
            await ClubService.updateShirt(club.id, shirt);
            await onSaved(t('The club shirt is saved.'));
        } catch (error) {
            onError(t('Club shirt'), error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Panel header={t('Club shirt')} className="mt-4">
            <p className="text-subtle fs-7 mt-0 mb-3">{t('The shirt every member plays in, with the name of the club on the chest: in the walk-on of a match, on the profiles and in the games. From the level Pro on a player may wear a shirt of their own.')}</p>
            <div className="club-shirt-editor">
                <div className="club-shirt-preview">
                    <ShirtPicture design="club" club={{ ...club, shirt }} uid="club-shirt-preview" />
                </div>
                <div className="d-flex flex-column gap-3 min-w-0">
                    <div className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-8">{t('Pattern')}</span>
                        <SelectButton value={shirt.pattern} options={PATTERNS} onChange={(event) => event.value && set({ pattern: event.value })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('Pattern')} />
                    </div>
                    <div className="d-flex flex-column gap-2">
                        <Swatches label={t('Main colour')} value={shirt.color} onChange={(color) => set({ color })} />
                        <Button type="button" label={t('The club colour')} size="small" text={shirt.color !== null} severity="secondary" className="align-self-start" onClick={() => set({ color: null })} />
                    </div>
                    {shirt.pattern !== 'plain' && <Swatches label={t('Second colour')} value={shirt.accent} onChange={(accent) => set({ accent })} />}
                    <label className="d-flex align-items-center gap-2">
                        <InputSwitch checked={shirt.logo} onChange={(event) => set({ logo: event.value })} disabled={!club.logo} />
                        <span className="text-default fs-7">{t('The club logo on the chest')}</span>
                        {!club.logo && <span className="text-faint fs-8">{t('(add a logo above first)')}</span>}
                    </label>
                    <div className="d-flex justify-content-end">
                        <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed} onClick={save} />
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default ClubShirtEditor;
