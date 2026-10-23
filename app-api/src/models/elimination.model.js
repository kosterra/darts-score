const IN_MODES  = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      gameIsRunning:     { type: Boolean, default: true },
      isSoloGame:        { type: Boolean, default: false },
      hasWinner:         { type: Boolean, default: false },
      targetScore:       { type: Number, min: 1 },
      gameInMode:        { type: String, enum: IN_MODES },
      gameOutMode:       { type: String, enum: OUT_MODES },
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

  return mongoose.model('elimination', schema);
};
