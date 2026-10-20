export default (mongoose) => {
  const answer = mongoose.Schema(
    {
      player:   { type: String, required: true },
      nickname: String,
      // the login of the player; without one only the club admins decide
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
      // 'agreed', 'declined' or null while not answered
      answer:   { type: String, enum: ['agreed', 'declined', null], default: null },
      at:       Date,
    },
    { _id: false }
  );
  const schema = mongoose.Schema(
    {
      club:      { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      // the game: 'x01', 'cricket', 'elimination' or 'clock', and its id
      type:      { type: String, required: true },
      game:      { type: String, required: true },
      summary:   String,
      playedAt:  Date,
      // who asked, as a user and as the player in the game
      by:        { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      byName:    String,
      reason:    { type: String, default: '' },
      players:   [answer],
      // 'open', then 'deleted' (by an admin or because everyone agreed), 'kept' or 'withdrawn'
      status:    { type: String, enum: ['open', 'deleted', 'kept', 'withdrawn'], default: 'open' },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      decidedByName: String,
      decidedAt: Date,
      note:      { type: String, default: '' },
    },
    { timestamps: true }
  );
  // one open request per game
  schema.index({ game: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
  schema.index({ club: 1, status: 1 });
  return mongoose.model('deletionRequest', schema);
};
