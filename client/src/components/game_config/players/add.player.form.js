import React, { Component } from 'react';
import Modal from '../../shared/UIElement/Modal';


class AddPlayerForm extends Component {

    constructor(props) {
        super(props);

        

        this.state = {
          firstname: '',
          lastname: '',
          nickname: ''
        }
    }

    handleSubmit = e => {
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                firstname: this.state.firstname,
                lastname: this.state.lastname,
                nickname: this.state.nickname
            })
        }).then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            window.app.Router.redirectTo('/');
        }).catch(error => {
            this.setState({
                firstname: this.state.firstname,
                lastname: this.state.lastname,
                nickname: this.state.nickname,
                type: 'danger',
                message: 'Failed to create a new player. Please try again!'
            });
            console.log("Failed to create a new player! " + error.message);
        });

        e.preventDefault();
    };

    render() {
        return (
            <Modal 
                isForm
                header={'Add a new player'}
                onSubmit={onCreatePlayer}
                onClickModalBackground={() => setShowAddPlayer(false)}
                contentClass={"add-player-content"}
                footer={(
                    <Fragment>
                        <button className="modal-btn" type="submit">
                            <i className="fas fa-user-plus"></i>
                            Create Player
                        </button>
                        <button className="modal-btn" onClick={() => setShowAddPlayer(false)}>
                            <i className="fas fa-times"></i>
                            Close
                        </button>
                    </Fragment>
                )}
            >
                <div className="input-container">
                    <Input 
                        element="input"
                        type="text"
                        name="playerFirstname"
                        value={playerFirstname}
                        htmlFor={"playerFirstname"}
                        label={"Player Firstname:"}
                        onChange={e => setNewPlayerFirstname(e.target.value)}
                        minLength={2}
                        maxLength={15}
                        required={true}
                    />
                    <Input 
                        element="input"
                        type="text"
                        name="playerLastname"
                        value={playerLastname}
                        htmlFor={"playerLastname"}
                        label={"Player Lastname:"}
                        onChange={e => setNewPlayerLastname(e.target.value)}
                        minLength={2}
                        maxLength={15}
                        required={true}
                    />
                    <Input 
                        element="input"
                        type="text"
                        name="playerNickname"
                        value={playerNickname}
                        htmlFor={"playerNickname"}
                        label={"Player Nickname:"}
                        onChange={e => setNewPlayerNickname(e.target.value)}
                        minLength={2}
                        maxLength={15}
                        required={true}
                    />
                </div>
                {createPlayerSuccessMsg && (
                    <p className="create-player-msg">{createPlayerSuccessMsg}</p>
                )}
            </Modal>
        );
    }
}

export default AddPlayerForm;