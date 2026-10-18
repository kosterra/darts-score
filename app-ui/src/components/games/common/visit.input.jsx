import { useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import ScoreInputBoardHelp from './score.input.board.help';
import { INPUTS } from './use.input.mode';

// s, d and t work as well: the dart is written in capitals once typed
const KEYFILTER = /^[SDTsdt0-9]{1,3}$/;

/**
 * The playing area of a game as on the X01 page: the board on its own (or the
 * keypad) next to the panel of the visit, with a panel of the game's own below
 * it ("aside", e.g. the ways out or the marks).
 *
 * darts: the three darts of the visit; shown: which dart fields to show;
 * onDart(index, value) types one, onClearDart(index) clears one; summary: the
 * line with what the visit does; busted: whether it is a bust; onSubmit() and
 * onUndo() enter the visit and take the last one back.
 */
const VisitInput = ({
    nickname, input, onChooseInput, board, keypad, aside, asideTitle,
    darts, shown, onDart, onClearDart, summary, busted = false,
    onSubmit, onUndo, canUndo, loading = false,
}) => {
    // Enter enters the visit, also after darts were tapped on the board; in a
    // dart field the browser submits the form itself
    useEffect(() => {
        const enter = (e) => {
            if (e.key !== 'Enter' || e.target.closest?.('form, button, [role="dialog"]')) return;
            document.getElementById('submitThrows')?.click();
        };
        document.addEventListener('keyup', enter);
        return () => document.removeEventListener('keyup', enter);
    }, []);

    const submit = (e) => {
        e.preventDefault();
        if (e.nativeEvent.submitter?.id === 'submitReturn') onUndo();
        else onSubmit();
        e.target.reset();
    };

    const header = (
        <div className="p-panel-header">
            <span className="p-panel-title">{nickname}&apos;s visit</span>
            <span className="d-inline-flex align-items-center gap-2">
                <SelectButton
                    value={input}
                    options={INPUTS}
                    onChange={(e) => onChooseInput(e.value)}
                    itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-1"><i className={option.icon} aria-hidden="true" />{option.label}</span>}
                    className="p-selectbutton-pills pills-inline x01-input-switch"
                    aria-label="Enter the darts with"
                />
                <ScoreInputBoardHelp label="" plainSingles compact />
            </span>
        </div>
    );

    return (
        <div className="row g-4 x01-play">
            <div className="col-12 col-lg-7 x01-board-plain">
                {input === 'keypad' ? keypad : <div className="x01-board-col">{board}</div>}
            </div>
            <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                <Panel headerTemplate={() => header} className="x01-input">
                    <form onSubmit={submit}>
                        <div className="x01-darts">
                            {shown.map((visible, index) => visible && (
                                <label key={index} className="x01-dart-field">
                                    <span className="x01-dart-label">Dart {index + 1}</span>
                                    <span className="x01-dart-box">
                                        <InputText
                                            name={`d-${index + 1}`}
                                            placeholder={index === 0 ? 'e.g. T20' : ''}
                                            value={darts[index]}
                                            keyfilter={KEYFILTER}
                                            validateOnly
                                            onInput={(event, valid) => { if (valid) onDart(index, event.target.value.toUpperCase()); }}
                                            autoComplete="off"
                                            // with the keypad, tapping a field opens no keyboard on a phone
                                            inputMode={input === 'keypad' ? 'none' : 'text'}
                                            className="x01-dart-input"
                                        />
                                        {darts[index] !== '' &&
                                            <button
                                                type="button"
                                                className="x01-dart-clear"
                                                title="Clear this dart"
                                                aria-label={`Clear dart ${index + 1}`}
                                                onClick={() => onClearDart(index)}
                                            >
                                                <i className="pi pi-times" aria-hidden="true" />
                                            </button>
                                        }
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* on a phone with the board this floats above the menu bar, always in reach */}
                        <div className={`x01-visit-bar ${input === 'board' ? 'is-floating' : ''}`}>
                            <div className="x01-visit-bar-darts" aria-hidden="true">
                                {darts.map((dart, index) => <span key={index} className={dart ? '' : 'is-empty'}>{dart || '–'}</span>)}
                            </div>
                            <div className={`x01-visit-total ${busted ? 'is-bust' : ''}`} aria-live="polite">{summary}</div>
                            <div className="x01-visit-actions">
                                <Button
                                    id="submitThrows"
                                    type="submit"
                                    label="Enter score"
                                    icon="pi pi-check"
                                    loading={loading}
                                    className="justify-content-center x01-enter"
                                />
                                {canUndo &&
                                    // small next to the main action: an exception, not a second choice
                                    <Button
                                        id="submitReturn"
                                        type="submit"
                                        aria-label="Undo last visit"
                                        tooltip="Undo last visit"
                                        tooltipOptions={{ position: 'top' }}
                                        icon="pi pi-undo"
                                        severity="danger"
                                        className="x01-undo"
                                    />
                                }
                            </div>
                        </div>
                    </form>
                </Panel>
                {aside && <Panel header={asideTitle} className="x01-ways-panel">{aside}</Panel>}
            </div>
        </div>
    );
};

export default VisitInput;
