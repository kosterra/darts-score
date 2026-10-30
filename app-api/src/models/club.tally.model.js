// What one finished game added to its club, for the club's badges and goals:
// worked out once when the game is finished, so the club never replays all its
// games. Goes when the game is deleted.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      sourceType: { type: String, required: true },
      sourceId:   { type: String, required: true },
      // when the game was finished, and from which version of it the tally is
      at:         { type: Date, required: true },
      players:    { type: [String], default: [] },
      darts:      { type: Number, default: 0 },
      num180s:    { type: Number, default: 0 },
      tonPlus:    { type: Number, default: 0 },
      highFinishes: { type: Number, default: 0 },
      // who threw the first of something in it: { max180: [playerId], bigFish: [...], nineDarter: [...], shanghaiFinish: [...] }
      firsts:     { type: mongoose.Schema.Types.Mixed, default: {} },
      // who won it and whether it was friendly, for the club's rating
      winners:    { type: [String], default: [] },
      friendly:   { type: Boolean, default: false },
      // doubles: the two teams [[a1, a2], [b1, b2]]; partners are no opponents
      teams:      { type: [[String]], default: undefined },
      // each player's own share: { [playerId]: { num180s } }
      byPlayer:   { type: mongoose.Schema.Types.Mixed, default: {} },
      version:    { type: Number, default: 1 },
    },
    { timestamps: false }
  );
  schema.index({ club: 1, at: 1 });
  // one tally per club and game: a shared tournament's game counts for every
  // club that took part, each with its own players (see utils/club.badge.service.js)
  schema.index({ club: 1, sourceId: 1 }, { unique: true });
  schema.index({ sourceId: 1 });
  return mongoose.model('clubtally', schema);
};
