import React from 'react';

import ProgressBar from 'react-bootstrap/ProgressBar';

const ComparisonBar = (props) => {
    const {
        title,
        barLValue,
        barRValue,
        unit,
        barLSubvalue,
        barRSubvalue
    } = props;

    return (
        <div className={`mt-2 ${barLValue === 0 && barRValue === 0 ? 'd-none' : ''}`}>
            <div className="d-flex justify-content-between align-items-baseline">
                <span className="d-flex flex-column">
                    <span className="me-1 fs-8 text-grey">{barLValue} {unit}</span>
                    { barLSubvalue && 
                        <span className="me-1 fs-9 text-grey">{barLSubvalue}</span>
                    }
                </span>
                <span className="d-flex align-self-end fs-7">{title}</span>
                <span className="d-flex flex-column">
                    <span className="me-1 fs-8 text-grey text-end">{barRValue} {unit}</span>
                    { barRSubvalue && 
                        <span className="me-1 fs-9 text-grey text-end">{barRSubvalue}</span>
                    }
                </span>
            </div>
            <ProgressBar className="border-0 radius-0 bg-transparent">
                <ProgressBar className="border-0 radius-0" variant="primary" now={barLValue} max={barLValue + barRValue <= 100 ? barLValue + barRValue : 100} key={1}/>
                <ProgressBar className="border-0 radius-0" variant="secondary" now={barRValue} max={barLValue + barRValue <= 100 ? barLValue + barRValue : 100} key={2} />
            </ProgressBar>
        </div>
    )
}
    
export default ComparisonBar;