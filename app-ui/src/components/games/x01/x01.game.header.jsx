const X01GameHeader = ({
    setMode = 'Set Mode',
    numberOfSets = 1,
    legMode = 'Leg Mode',
    numberOfLegs = 1,
    legInMode = 'Straight In',
    legOutMode = 'Double Out'
}) => {
    const pluralize = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

    return (
        <div className="d-flex justify-content-center mb-4">
            <div className="d-flex flex-column align-items-center rounded-bottom-4 bg-shade700 p-3 px-4 text-center shadow-sm">
                <div className="text-shade100 fs-6 fw-semibold">
                    {setMode} <strong>{pluralize(numberOfSets, 'Set')}</strong> – {legMode} <strong>{pluralize(numberOfLegs, 'Leg')}</strong>
                </div>
                <div className="text-shade400 fs-8 pt-1 fw-medium">
                    {legInMode} / {legOutMode}
                </div>
            </div>
        </div>
    );
};

export default X01GameHeader;
