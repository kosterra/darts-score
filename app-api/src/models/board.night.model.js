import { NIGHT_STATUSES } from '../rules/boards.js';

// how long a club night played on boards is kept: the games stay, the queue of the night goes
export const BOARD_NIGHT_KEEP_DAYS = 60;

// A club night played on boards (see rules/boards.js and utils/boards.js): the boards, the game
// every pairing plays, the players there, and the pairings with the board each is called to
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:    { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      // the night as "YYYY-MM-DD"
      day:     { type: String, required: true },
      boards: {
        count: { type: Number, min: 0, max: 16, default: 2 },
        out:   { type: [Number], default: [] },
      },
      // the game every pairing plays, as a quick game is set up (see app-ui/src/utils/quick.games.js)
      setup: {
        _id: false,
        kind: { type: String, enum: ['x01', 'cricket', 'elimination'], default: 'x01' },
        startingScore: Number, legOutMode: String, numberOfLegs: Number,
        variant: String, targetScore: Number, gameOutMode: String,
      },
      // the players there, by id
      players: { type: [String], default: [] },
      entries: {
        type: [{
          _id: false,
          id:       { type: String, required: true },
          players:  { type: [String], default: [] },
          status:   { type: String, enum: NIGHT_STATUSES, default: 'queued' },
          board:    { type: Number, default: null },
          held:     { type: Boolean, default: false },
          game:     { kind: String, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
          winner:   { type: String, default: null },
          readyAt:  { type: Date, default: null },
          calledAt: { type: Date, default: null },
          doneAt:   { type: Date, default: null },
        }],
        default: [],
      },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    },
    // two games finishing at once both save the entries: the second retries
    { timestamps: true, minimize: false, optimisticConcurrency: true }
  );
  schema.index({ club: 1, day: 1 }, { unique: true });
  // the night a finished game belongs to
  schema.index({ 'entries.game.id': 1 });
  schema.index({ createdAt: 1 }, { expireAfterSeconds: BOARD_NIGHT_KEEP_DAYS * 24 * 60 * 60 });

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('boardNight', schema);
};
