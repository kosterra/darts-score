import * as BoardController from '../controllers/board.controller.js';

// the boards of the user asking, in any of their clubs: "Your match: board 2"
export default (app) => {
    app.get('/api/boards/mine', BoardController.mine);
};
