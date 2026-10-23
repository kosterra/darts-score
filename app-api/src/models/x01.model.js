const SET_LEG_MODES = ['Best of', 'First to'];
const IN_MODES     = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES    = ['Straight Out', 'Double Out', 'Master Out'];

// name: 'x01' for the games, 'x01training' for the trainings against the bot,
// which keep the same layout in a collection of their own (out of every game statistic)
export default (mongoose, name = 'x01') => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      gameIsRunning:      { type: Boolean, default: true },
      isSoloGame:         { type: Boolean, default: false },
      hasWinner:          { type: Boolean, default: false },
      startingScore:      { type: Number, min: 1 },
      setMode:            { type: String, enum: SET_LEG_MODES },
      legMode:            { type: String, enum: SET_LEG_MODES },
      legInMode:          { type: String, enum: IN_MODES },
      legOutMode:         { type: String, enum: OUT_MODES },
      numberOfSets:       { type: Number, min: 1 },
      numberOfLegs:       { type: Number, min: 1 },
      numberOfPlayers:    { type: Number, enum: [1, 2, 3, 4] },
      currentPlayerTurn:  String,
      // who throws first, when not the first player (only games from earlier versions of the app)
      starter:           String,
      players:            [String],
      // a handicap: the players' own rules, { [playerId]: { startingScore, legInMode, legOutMode } }
      handicap:           mongoose.Schema.Types.Mixed,
      // every visit in order, { player, darts: ['T20', 'D16', '0'] }: the game follows from them
      visits:             { type: [{ _id: false, player: String, darts: [String] }], default: [] },
      // worked out from the visits (the legs, sets and figures follow from them too, see utils/game.view.js)
      playerModels:       mongoose.Schema.Types.Mixed,
      // whether the darts fly onto the board: 'players' as each player set it, 'on' or 'off' for everyone
      flyingDarts:        { type: String, enum: ['players', 'on', 'off'], default: 'players' },
      // a training against the bot: how strong it plays { average, checkoutRate, basis }
      bot:                mongoose.Schema.Types.Mixed,
      // a friendly game: left out of the club's leaderboards, records and Hall of Shame
      friendly:          { type: Boolean, default: false },
      // the club format it was started from, when one
      format:            String,
      // the club's house rules: who starts the next leg, a limit of rounds per leg, the bull as 50
      legStarter:        { type: String, enum: ['rotate', 'loser'], default: 'rotate' },
      roundLimit:        { type: Number, min: 0, default: 0 },
      bull:              { type: String, enum: ['split', 'fifty'], default: 'split' },
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

  return mongoose.model(name, schema);
};
