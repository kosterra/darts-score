import React from 'react';
import Button from 'react-bootstrap/Button';

import X01ScoreConfig from './config_components/x01.score.config'
import X01InOutConfig from './config_components/x01.inout.config'
import SetsLegsConfig from './config_components/sets.legs.config'
import PlayerConfig from './config_components/player.config' 

class X01Config extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
          firstname: '',
          lastname: '',
          nickname: ''
        }
    }

    render() {
        return (
            <div>
                <X01ScoreConfig />
                <X01InOutConfig />
                <SetsLegsConfig />
                <PlayerConfig />
                <div className="col-xs-1 p-3" align="center">
                    <Button variant="primary" className="text-light m-0 p-2">Start Game</Button>
                </div>
            </div>
        );
    }
}

export default X01Config;
