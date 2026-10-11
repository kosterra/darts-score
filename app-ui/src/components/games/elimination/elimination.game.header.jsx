const EliminationGameHeader = ({ targetScore, gameInMode, gameOutMode }) => {
    return (
        <div className="d-flex justify-content-center mb-4">
            <div className="d-flex flex-column align-items-center rounded-bottom-4 bg-surface-high p-3 px-4 text-center shadow-sm">
                <div className="text-default fs-6 fw-bold">Elimination</div>
                <div className="text-subtle fs-7 mt-1 d-flex flex-wrap gap-3 justify-content-center">
                    <span>
                        <strong>Target:</strong> {targetScore}
                    </span>
                    {gameInMode && gameInMode !== 'Straight In' && (
                        <span>
                            <strong>In:</strong> {gameInMode}
                        </span>
                    )}
                    <span>
                        <strong>Out:</strong> {gameOutMode}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EliminationGameHeader;
