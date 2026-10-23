import { useState } from 'react';

import RULES from '../../about/rules';
import { t } from '../../../utils/i18n';

/**
 * The rules of a game while it is played, as on the About page: a button in
 * the header that opens them right there, without a popup; closed at first,
 * the short description of the game is there instead. → [button, panel]
 * houseRules: the club's house rules this game is played with, in words, shown first
 */
const useGameRules = (id, houseRules = []) => {
    const [open, setOpen] = useState(false);
    const entry = RULES.find(rule => rule.id === id);
    if (!entry) return [null, null];
    const button = (
        <button type="button" className={`game-rules-toggle ${open ? 'is-open' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
            <i className="pi pi-book" aria-hidden="true" />
            {t('Rules')}
            <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'} fs-9`} aria-hidden="true" />
        </button>
    );
    const panel = open && (
        <div className="game-rules text-subtle fs-7 about-rules">
            {houseRules.length > 0 &&
                <div className="game-house-rules">
                    <strong className="text-default">{t('House rules of this game')}</strong>
                    <ul className="mb-0">{houseRules.map(line => <li key={line}>{line}</li>)}</ul>
                </div>}
            {entry.body}
        </div>
    );
    return [button, panel];
};

export default useGameRules;
