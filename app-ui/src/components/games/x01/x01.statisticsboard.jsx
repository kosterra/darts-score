import { useContext, useMemo } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import X01Context from '../../../utils/x01.context';

const getNested = (obj, path, fallback = 0) =>
    path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? fallback;

const StatRow = ({ label, values }) => (
    <div className="d-flex justify-content-between text-shade500 fs-9">
        <span className="col-4">{label}</span>
        {values.map((v, i) => (
            <span key={i} className="col-2 text-center">{v}</span>
        ))}
    </div>
);

const X01StatisticsBoard = ({ playerId }) => {
    const { game, players } = useContext(X01Context);
    const pm = game.playerModels[playerId] || {};
    const currentSet = `set-${game.currentSet}`;
    const currentLeg = `leg-${game.currentSetLeg}`;
    const player = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);

    const ranges = ['180', '160-179', '140-159', '120-139', '100-119', '80-99', '60-79', '40-59', '20-39', '1-19', 'ZERO'];

    return (
        <div className="container-fluid">
            <div className="row justify-content-md-center">
                <div className="d-flex justify-content-center align-items-center">
                    <span className="text-shade100 fs-6 fw-semibold text-center pb-2">{player?.nickname}</span>
                </div>

                {/* === LEFT COLUMN === */}
                <div className="col-12 col-xxl-6 p-0 px-1 px-md-2 pb-0">
                    <Accordion multiple activeIndex={[0]}>
                        {/* Averages */}
                        <AccordionTab header="Averages">
                            {['overall', 'begMid', 'end'].map((type) => (
                                <StatRow
                                    key={type}
                                    label={type === 'begMid' ? 'Beg / Mid' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    values={[
                                        Math.round(getNested(pm, ['averages', currentSet, currentLeg, `${type}Leg`])),
                                        Math.round(getNested(pm, ['averages', currentSet, `${type}Set`])),
                                        Math.round(getNested(pm, ['averages', 'game', `${type}Game`])),
                                    ]}
                                />
                            ))}
                        </AccordionTab>

                        {/* Amount */}
                        <AccordionTab header="Amount">
                            <StatRow
                                label="Best Three"
                                values={[
                                    getNested(pm, ['bestThreeDarts', currentSet, currentLeg, 'value']),
                                    getNested(pm, ['bestThreeDarts', currentSet, 'value']),
                                    getNested(pm, ['bestThreeDarts', 'game', 'value']),
                                ]}
                            />
                            {ranges.map((r) => (
                                <StatRow
                                    key={r}
                                    label={r}
                                    values={[
                                        getNested(pm, ['scoreRanges', currentSet, currentLeg, r]),
                                        getNested(pm, ['scoreRanges', currentSet, r]),
                                        getNested(pm, ['scoreRanges', 'game', r]),
                                    ]}
                                />
                            ))}
                        </AccordionTab>

                        {/* Checkout */}
                        <AccordionTab header="Checkout">
                            <StatRow
                                label="Highest"
                                values={[
                                    Math.max(0, ...Object.keys(getNested(pm, ['checkoutScores', currentSet, currentLeg], {})).filter(k => !isNaN(k))),
                                    Math.max(0, ...Object.keys(getNested(pm, ['checkoutScores', currentSet], {})).filter(k => !isNaN(k))),
                                    Math.max(0, ...Object.keys(getNested(pm, ['checkoutScores', 'game'], {})).filter(k => !isNaN(k))),
                                ]}
                            />
                            <StatRow
                                label="Doubles Hit"
                                values={[
                                    Object.values(getNested(pm, ['checkoutScores', currentSet, currentLeg], {})).filter(k => !isNaN(k)).reduce((a, b) => a + b, 0),
                                    Object.values(getNested(pm, ['checkoutScores', currentSet], {})).filter(k => !isNaN(k)).reduce((a, b) => a + b, 0),
                                    Object.values(getNested(pm, ['checkoutScores', 'game'], {})).filter(k => !isNaN(k)).reduce((a, b) => a + b, 0),
                                ]}
                            />

                            {[...Array(20)].map((_, i) => {
                                const section = getNested(pm, ['checkout', 'sections', i + 1]);
                                return section ? (
                                    <StatRow
                                        key={i}
                                        label={`Double ${i + 1}`}
                                        values={[`${section.hit || 0} / ${section.total || 0}`]}
                                    />
                                ) : null;
                            })}

                            {getNested(pm, ['checkout', 'sections', '25', 'total']) > 0 && (
                                <StatRow
                                    label="BULLSEYE"
                                    values={[`${getNested(pm, ['checkout', 'sections', '25', 'hit'])} / ${getNested(pm, ['checkout', 'sections', '25', 'total'])}`]}
                                />
                            )}
                        </AccordionTab>
                    </Accordion>
                </div>

                {/* === RIGHT COLUMN === */}
                <div className="col-12 col-xxl-6 p-0 px-1 px-md-2 pt-0">
                    <Accordion multiple activeIndex={[0]}>
                        <AccordionTab header="Per Round Score">
                            <div className="container">
                                <div className="row mb-1">
                                    <span className="col-4 p-0 fs-8 text-shade100 fw-semibold">Initial</span>
                                    <span className="col-8 p-0 fs-8 text-shade100 fw-semibold text-end">501</span>
                                </div>
                                {game.currentLegThrows
                                    .filter(e => e.playerId === playerId)
                                    .map((t, i) => (
                                        <div key={i} className="row mb-1">
                                            <span className="col-2 p-0 fs-8 text-shade100 fw-semibold">R{i + 1}</span>
                                            {t.darts.map((d, j) => (
                                                <span key={j} className="col-2 p-0 fs-9 text-shade500 fst-italic text-end">{d}</span>
                                            ))}
                                            <span className="col-2 p-0 fs-9 text-shade500 fw-semibold text-end">{t.roundScore}</span>
                                            <span className="col-2 p-0 fs-8 text-shade100 fw-semibold text-end">{t.scoreLeft}</span>
                                        </div>
                                    ))}
                            </div>
                        </AccordionTab>
                    </Accordion>
                </div>
            </div>
        </div>
    );
};

export default X01StatisticsBoard;
