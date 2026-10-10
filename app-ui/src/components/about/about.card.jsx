import { Panel } from 'primereact/panel';
import { Card } from 'primereact/card';

import { FaEnvelope, FaReact, FaExternalLinkAlt } from "react-icons/fa";

import { SiVite, SiBootstrap } from "react-icons/si";

const AboutCard = () => {

    const renderFooter = (link) => {
        return (
            <div className="d-flex justify-content-end">
                <a href={link} target="_blank" rel="noopener noreferrer" className="p-button font-bold">
                    <FaExternalLinkAlt className="fs-6" />
                </a>
            </div>
        );
    };

    return (
        <Panel header="About" className="w-100 w-md-75 w-xxl-50 mx-auto" >
            <div className="d-flex justify-content-center my-4 fs-5 fw-semibold">Built using</div>
            <div className="row">
                <div className="col col-12 col-xl-6 my-2">
                    <Card title="Vite" subTitle="Next Generation Frontend Tooling" footer={renderFooter('https://vitejs.dev/')}>
                        <span className="d-flex justify-content-center m-0 display-1">
                            <SiVite />
                        </span>
                    </Card>
                </div>
                <div className="col col-12 col-xl-6 my-2">
                    <Card title="React" subTitle="The library for web and native user interfaces" footer={renderFooter('https://reactjs.org/') }>
                        <span className="d-flex justify-content-center m-0 display-1">
                            <FaReact />
                        </span>
                    </Card>
                </div>
                <div className="col col-12 col-xl-6 my-2">
                    <Card title="PrimeReact" subTitle="The Most Complete UI Suite for React.js" footer={renderFooter('https://primereact.org/')}>
                        <span className="d-flex justify-content-center m-0">
                            <i className="pi pi-prime display-1" />
                        </span>
                    </Card>
                </div>
                <div className="col col-12 col-xl-6 my-2">
                    <Card title="Bootstrap" subTitle="A powerful frontend toolkit" footer={renderFooter('https://getbootstrap.com/')}>
                        <span className="d-flex justify-content-center m-0 display-1">
                            <SiBootstrap />
                        </span>
                    </Card>
                </div>
            </div>
            <div className="d-flex justify-content-center my-4 fs-5 fw-semibold">Contact</div>
            <div className="d-flex justify-content-center">
                <a href="mailto:rkoster@gmx.ch" className="p-button p-button-sm">
                    <FaEnvelope className="pe-2 fs-3" />
                    E-Mail
                </a>
            </div>
        </Panel>
    );
};

export default AboutCard;