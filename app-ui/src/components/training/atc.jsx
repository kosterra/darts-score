import { useState, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import Stopwatch from "../elements/stopwatch";
import PlayerSelect from "../elements/player.select";
import ATCEntryList from './atc.enty.list';
import ATCService from "../../services/atc.service";
import ATCEntryModel from "../../models/atc.model";
import ATCModeConfig from './atc.mode.config';
import ATCConfigOptions from './atc.config.options';

const ATC = () => {
    const [player, setPlayer] = useState({});
    const [mode, setMode] = useState(ATCConfigOptions.modeOptions.default);
    const [atcEntries, setATCEntries] = useState([]);

    useEffect(() => {
        loadATCEntries();
    }, [mode]);

    const loadATCEntries = async () => {
        let data = await ATCService.loadATCEntries(mode);
        data.sort((a, b) => {
            return a.timeMs - b.timeMs;
        });
        setATCEntries(data);
    }
    const toast = useRef(null);

    const onSelectPlayer = async (player) => {
        setPlayer(player)
    };

    const onDeletePlayer = () => {
        setPlayer({})
    };

    const handleModeChange = (value) => {
        setMode(value);
    }

    const saveChallenge = async (timeMs, hours, minutes, seconds, milliseconds) => {
        const atcEntry = ATCEntryModel;
        atcEntry.timeMs = timeMs;
        atcEntry.hours = hours;
        atcEntry.minutes = minutes;
        atcEntry.seconds = seconds;
        atcEntry.milliseconds = milliseconds;
        atcEntry.mode = mode;
        atcEntry.player = player;

        try {
            if (await ATCService.createATCEntry(atcEntry)) {
                toast.current.show(
                    {
                        severity: 'success',
                        summary: 'Create ATC entry',
                        detail: 'Successfully added ATC entry',
                        life: 3000
                    }
                );

                loadATCEntries();
            }
        } catch {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Create ATC entry',
                    detail: 'Failed to create ATC entry',
                    life: 3000
                }
            );
        }
    };

    const headerTemplate = () => {
        return (
            <div className="p-panel-header" >
                <div>
                    <div className="text-center fs-6 fw-semibold">Around the Clock</div>
                    <div className="text-center fs-8 fw-medium">Play Game</div>
                </div>
            </div>
        );
    };

    return (
        <div className="container-fluid p-4">
            <div className="row d-flex">
                <span className="fs-2 text-default text-center mb-4">Around the clock</span>
                <Panel headerTemplate={headerTemplate} className="col-12 col-lg-7 col-xl-6 col-xxl-5 mt-4" >
                    <div className="d-flex flex-column justify-content-center align-items-center">
                        <div className="col-10 col-lg-8 mb-4">
                            <PlayerSelect
                                onSelect={onSelectPlayer}
                                onDelete={onDeletePlayer}
                            />
                        </div>
                        <div>
                            <ATCModeConfig
                                atcModeOption={mode}
                                onATCModeChange={handleModeChange}
                            />
                        </div>
                        <div className="col-10 mb-4">
                            <Stopwatch onSave={saveChallenge} hasPlayer={!(Object.keys(player).length === 0)} />
                        </div>
                    </div>
                </Panel>
                <div className="col-12 col-lg-5 col-xl-6 col-xxl-7 col-md-8 mt-4">
                    <ATCEntryList atcEntries={atcEntries} />
                </div>
            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
}

export default ATC;