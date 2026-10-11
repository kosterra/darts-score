export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      firstname:  { type: String, required: true, trim: true },
      lastname:   { type: String, required: true, trim: true },
      nickname:   { type: String, required: true, trim: true },
      profileImg: { type: String, default: '' },
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      // A guest only exists for the games they were added to: not offered when
      // picking players and not listed as a club member
      guest:      { type: Boolean, default: false },
      // The account that can log in as this player; makes that user a member of the club
      user:       { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    },
    { timestamps: true }
  );

  // Speeds up name/nickname search queries
  schema.index({ nickname: 1, firstname: 1, lastname: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('player', schema);
};
