import React from 'react';

const AboutPage = () => {
	return (
		<div className="main-container about">
			<div className="title-container">
				<span className="title">About</span>
			</div>
			<div className="content-container">
				<div className="build-info-container">
					<span className="section-title">Built using</span>
					<div className="build-info">
						<span className="build-icon">
							<i className="fab fa-react"></i>
							<span><a href="https://reactjs.org/" target="_blank" rel="noopener noreferrer">React</a></span>
						</span>
						<span className="build-icon">
							<i className="fab fa-font-awesome"></i>
							<span><a href="https://fontawesome.com/" target="_blank" rel="noopener noreferrer">Font Awesome</a></span>
						</span>
						<span className="build-icon">
							<i className="fab fa-google"></i>
							<span><a href="https://fonts.google.com/" target="_blank" rel="noopener noreferrer">Google Fonts</a></span>
						</span>
					</div>
				</div>
				<div className="version-container">
					<span className="section-title">Version</span>
					<span>1.0.1-beta</span>
				</div>
				<span className="contact">
					<a className="contact-link button-link" href="mailto:rkoster@gmx.ch">
						<i className="fas fa-envelope"></i>
						Contact
					</a>
				</span>
			</div>
		</div>
	);
};

export default AboutPage;
