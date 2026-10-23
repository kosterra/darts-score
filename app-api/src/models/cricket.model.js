export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      gameIsRunning:     { type: Boolean, default: true },
      isSoloGame:        { type: Boolean, default: false },
      hasWinner:         { type: Boolean, default: false },
      // Cricket starts at 0 points
      startingScore:     { type: Number, min: 0, default: 0 },
      // Standard, Cut-throat (points go to the opponents, lowest wins) or No-score (closing only)
      variant:           { type: String, enum: ['Standard', 'Cut-throat', 'No-score'], default: 'Standard' },
      numberOfPlayers:   { type: Number, enum: [1, 2, 3, 4] },
      currentPlayerTurn: String,
      // who throws first, when not the first player (only games from earlier versions of the app)
      starter:           String,
      players:           [String],
      // every visit in order, { player, darts: ['T20', 'D16', '0'] }: the game follows from them
      visits:            { type: [{ _id: false, player: String, darts: [String] }], default: [] },
      // worked out from the visits
      playerModels:      mongoose.Schema.Types.Mixed,
      // whether the darts fly onto the board: 'players' as each player set it, 'on' or 'off' for everyone
      flyingDarts:       { type: String, enum: ['players', 'on', 'off'], default: 'players' },
      // a friendly game: left out of the club's leaderboards, records and Hall of Shame
      friendly:          { type: Boolean, default: false },
      // the club format it was started from, when one
      format:            String,
      // the club's house rule: after so many rounds the game is decided (0: no limit)
      roundLimit:        { type: Number, min: 0, default: 0 },
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

  return mongoose.model('cricket', schema);
};
