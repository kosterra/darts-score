export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:      { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      // who asks, with the name for when the account is gone later
      user:      { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      name:      String,
      // the nickname they play as in the club: the one of their player in another club, or a new one
      nickname:  { type: String, required: true },
      message:   { type: String, default: '' },
      // 'open', then 'accepted', 'declined' or 'withdrawn'
      status:    { type: String, enum: ['open', 'accepted', 'declined', 'withdrawn'], default: 'open' },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      decidedByName: String,
      decidedAt: Date,
    },
    { timestamps: true }
  );
  // one open request per club and user
  schema.index({ club: 1, user: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
  schema.index({ club: 1, status: 1 });
  schema.index({ user: 1, status: 1 });
  return mongoose.model('joinRequest', schema);
};
