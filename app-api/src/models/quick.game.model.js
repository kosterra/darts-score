import { QUICK_KEEP_DAYS } from '../utils/quick.games.js';

// A quick game from the public start page: no club, the players only names
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // 'x01' or 'cricket'
      kind:          { type: String, required: true },
      // the game as the game page keeps it, with quickPlayers [{ id, nickname }]
      data:          { type: mongoose.Schema.Types.Mixed, required: true },
      // the names and the winner, for the list of the global admins
      names:         [String],
      winner:        { type: String, default: null },
      gameIsRunning: { type: Boolean, default: true },
      hasWinner:     { type: Boolean, default: false },
      // only the browser with the key plays on: its hash
      keyHash:       { type: String, required: true },
    },
    { timestamps: true, minimize: false }
  );
  // gone after a month
  schema.index({ createdAt: 1 }, { expireAfterSeconds: QUICK_KEEP_DAYS * 24 * 60 * 60 });
  return mongoose.model('quickGame', schema);
};
