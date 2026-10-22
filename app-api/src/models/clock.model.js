const MODES = ['Single', 'Double', 'Triple', 'All'];

// Around the Clock as a game: the players take turns of three darts at 1 to
// 20 and the bull. The first to finish wins, after the round is completed so
// everyone has had as many turns; the same round finished: fewer darts win.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      gameIsRunning:     { type: Boolean, default: true },
      isSoloGame:        { type: Boolean, default: false },
      hasWinner:         { type: Boolean, default: false },
      mode:              { type: String, enum: MODES, default: 'All' },
      // a double moves on two numbers and a treble three (only with every ring counting)
      skipAhead:         { type: Boolean, default: false },
      numberOfPlayers:   { type: Number, enum: [2, 3, 4] },
      currentPlayerTurn: String,
      players:           [String],
      // every visit in order, { player, darts: ['T20', 'D16', '0'] }: the game follows from them
      visits:            { type: [{ _id: false, player: String, darts: [String] }], default: [] },

      // each player's state, worked out from the visits: { target, darts, perTarget, finished, rank, hasWonGame }
      playerModels:      mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
  );

  // Used by stats queries and game filter queries
  schema.index({ players: 1, gameIsRunning: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('clock', schema);
};
