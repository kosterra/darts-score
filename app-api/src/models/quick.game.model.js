import { QUICK_KEEP_DAYS, QUICK_UNFINISHED_DAYS } from '../utils/quick.games.js';

// A quick game from the public start page: no club, the players only names
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // 'x01', 'cricket' or 'elimination'
      kind:          { type: String, required: true },
      // the darts evening it was played in, if any
      evening:       { type: mongoose.Schema.Types.ObjectId, ref: 'quickEvening', default: null, index: true },
      // the game as the game page keeps it, with quickPlayers [{ id, nickname }]
      data:          { type: mongoose.Schema.Types.Mixed, required: true },
      // the names and the winner, for the list of the global admins
      names:         [String],
      winner:        { type: String, default: null },
      gameIsRunning: { type: Boolean, default: true },
      hasWinner:     { type: Boolean, default: false },
      // counted in the all-time tally of finished quick games (once, even after an undo)
      counted:       { type: Boolean, default: false },
      // only the browser with the key plays on: its hash
      keyHash:       { type: String, required: true },
    },
    { timestamps: true, minimize: false }
  );
  // gone after a month
  schema.index({ createdAt: 1 }, { expireAfterSeconds: QUICK_KEEP_DAYS * 24 * 60 * 60 });
  // one never finished sooner, a few days after its last visit (a darts evening loses it from its table)
  schema.index({ updatedAt: 1 }, { expireAfterSeconds: QUICK_UNFINISHED_DAYS * 24 * 60 * 60, partialFilterExpression: { hasWinner: false } });
  return mongoose.model('quickGame', schema);
};
