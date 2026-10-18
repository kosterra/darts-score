const X01GameHeader = ({
    setMode = 'Set Mode',
    numberOfSets = 1,
    legMode = 'Leg Mode',
    numberOfLegs = 1,
    legInMode = 'Straight In',
    legOutMode = 'Double Out',
    handicap = false
}) => {
    const pluralize = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

    return (
        <div className="x01-game-header-wrap">
            <div className="x01-game-header rounded-bottom-4 bg-surface-high text-center shadow-sm">
                <div className="x01-game-header-format text-default fw-semibold">
                    {setMode} <strong>{pluralize(numberOfSets, 'Set')}</strong> – {legMode} <strong>{pluralize(numberOfLegs, 'Leg')}</strong>
                </div>
                <div className="x01-game-header-rules text-subtle fw-medium">
                    {handicap ? 'Handicap: own starting score and in/out per player' : `${legInMode} / ${legOutMode}`}
                </div>
            </div>
        </div>
    );
};

export default X01GameHeader;
