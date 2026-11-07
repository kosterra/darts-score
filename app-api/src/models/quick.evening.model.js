import { QUICK_KEEP_DAYS } from '../utils/quick.games.js';

// A darts evening without an account (see utils/evenings.js): the players by
// name, played as quick games, with a link to share it read-only; gone after
// a month, also when it became a club (its players and games live on there).
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // e.g. "Friday at Lena's"; empty: the date names it
      name:       { type: String, default: '', trim: true },
      // the players of the evening, each with the same id in all its games; who came
      // later (joinedAt) and who went home (leftAt, no longer chosen for a game)
      players:    { type: [{ _id: false, id: String, name: String, joinedAt: { type: Date, default: null }, leftAt: { type: Date, default: null } }], default: [] },
      // only the browser with the key plays and changes it: its hash (its games carry the same)
      keyHash:    { type: String, required: true },
      // the link to follow it read-only
      shareToken: { type: String, required: true, unique: true },
      // the club it became, and when
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', default: null },
      adoptedAt:  { type: Date, default: null },
      // while it is being made a club: since when (only one request at a time does it)
      adopting:   { type: Date, default: null },
      // the club's player of each player of the evening, for a game finished after it became a club
      clubPlayers: { type: [{ _id: false, id: String, player: { type: mongoose.Schema.Types.ObjectId, ref: 'player' } }], default: [] },
      // when it ended: by hand, or by itself 12 hours after its last game (see utils/evenings.js)
      endedAt:    { type: Date, default: null },
      // counted in the all-time tally of darts evenings played (see utils/quick.tally.js)
      counted:    { type: Boolean, default: false },
    },
    { timestamps: true }
  );
  schema.index({ createdAt: 1 }, { expireAfterSeconds: QUICK_KEEP_DAYS * 24 * 60 * 60 });
  return mongoose.model('quickEvening', schema);
};
