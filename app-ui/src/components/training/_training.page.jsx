import { useParams } from "react-router-dom";
import ATC from './atc';

const TrainingPage = () => {
    const { id } = useParams();

    const renderTrainingContent = () => {
        switch (id) {
            case 'atc':
                return <ATC />;
            // Weitere Trainingsarten können hier hinzugefügt werden
            default:
                return <ATC />;
        }
    };

    return (
        <div className="container-fluid p-4 bg-transparent border-0">
            <div className="row justify-content-md-center align-items-center">
                {renderTrainingContent()}
            </div>
        </div>
    );
};

export default TrainingPage;
