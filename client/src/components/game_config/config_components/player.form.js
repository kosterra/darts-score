import React, { useState } from 'react';
import {toast} from 'react-toastify';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';

const PlayerForm = (props) => {
    const {onPlayerAdd} = props;

    const [showModal, setShowModal] = useState(false);
    const [validated, setValidated] = useState(false);

    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => setShowModal(true);

    const [values, setValues] = useState({
        firstname: "",
        lastname: "",
        nickname: ""
    });

    const handleChange = (event) => {
        setValues((values) => ({
            ...values,
            [event.target.name]: event.target.value,
        }));
    };

    const handleSubmit = (event) => {
        if (!validate()) {
            event.preventDefault();
            event.stopPropagation();
            setValidated(true);
        } else {
            setValidated(true);

            fetch(process.env.REACT_APP_API_URL + 'players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    firstname: values.firstname,
                    lastname: values.lastname,
                    nickname: values.nickname
                })
            }).then(response => {
                values.firstname = '';
                values.lastname = '';
                values.nickname = '';
    
                if (!response.ok) {
                    throw Error(response.statusText);
                } else {
                    toast.success('New Player created successfully.')
                    setValidated(false);
                    onPlayerAdd();
                }
            }).catch(error => {
                toast.error('Failed to create new Player. ' + error.message);
            });
        }
    }

    const validate = () =>{
        return values.firstname && values.firstname.length > 2 && values.firstname.length <= 25 &&
                values.lastname && values.lastname.length > 2 && values.lastname.length <= 25 &&
                values.nickname && values.nickname.length > 2 && values.nickname.length <= 25;
    }

    return (
        <div className="m-2 mb-4 justify-content-md-center align-items-center">
            <Modal show={showModal}
                onHide={handleCloseModal}
                fullscreen={false}
                aria-labelledby="contained-modal-title-vcenter"
                centered>
                <Form
                    noValidate
                    validated={validated}>
                    <Modal.Header closeButton closeVariant="white">
                        <Modal.Title className="h6">Add New Player</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                            <FloatingLabel controlId="floatingFirstname" label="Firstname" className="mb-3">
                                <Form.Control
                                    name="firstname"
                                    required
                                    type="text"
                                    placeholder="Firstname"
                                    value={values.firstname}
                                    onChange={handleChange}
                                    minLength={3}
                                    maxLength={25} />
                                <Form.Control.Feedback type="invalid">Between 3 and 25 characters required</Form.Control.Feedback>
                            </FloatingLabel>
                            <FloatingLabel controlId="floatingLastname" label="Lastname" className="mb-3">
                                <Form.Control
                                    name="lastname"
                                    required
                                    type="text"
                                    placeholder="Lastname"
                                    value={values.lastname}
                                    onChange={handleChange}
                                    minLength={3}
                                    maxLength={25} />
                                <Form.Control.Feedback type="invalid">Between 3 and 25 characters required</Form.Control.Feedback>
                            </FloatingLabel>
                            <FloatingLabel controlId="floatingNickname" label="Nickname" className="mb-3">
                                <Form.Control
                                    name="nickname"
                                    required
                                    type="text"
                                    placeholder="Nickname"
                                    value={values.nickname}
                                    onChange={handleChange}
                                    minLength={3}
                                    maxLength={25} />
                                <Form.Control.Feedback type="invalid">Between 3 and 25 characters required</Form.Control.Feedback>
                            </FloatingLabel>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal} className="p-2">
                            <i className="fas fa-times px-2"></i>
                            Close
                        </Button>
                        <Button variant="primary" onClick={handleSubmit} className="p-2">
                            <i className="fas fa-save px-2"></i>
                            Save
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <div className="d-flex justify-content-center">
                <Button variant="primary" className="text-light m-0" onClick={handleShowModal}>
                    <i className="fas fa-user-plus px-2"></i>
                </Button>
            </div>
        </div>
    );
};

export default PlayerForm;