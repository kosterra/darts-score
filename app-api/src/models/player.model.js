// A player is a member of one or more clubs; these filters find them
export const inClub = (clubId) => ({ clubs: clubId });
// ... and also those removed from the club, whose names its games still show
export const knownInClub = (clubId) => ({ $or: [{ clubs: clubId }, { formerClubs: clubId }] });

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      firstname:  { type: String, required: true, trim: true },
      lastname:   { type: String, required: true, trim: true },
      nickname:   { type: String, required: true, trim: true },
      profileImg: { type: String, default: '' },
      // The clubs the player is a member of: one person can play in several clubs
      clubs:       { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club' }], default: [] },
      // Clubs the player was removed from; their games there keep showing the name
      formerClubs: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club' }], default: [] },
      // Badges the player has collected, each with the game or training it was earned in
      badges: [{
        _id: false,
        badge:      { type: String, required: true },
        earnedAt:   { type: Date, required: true },
        sourceType: String,
        sourceId:   String,
      }],
      // Weeks played in a row, kept up to date with the badges
      activity: {
        lastWeek:       { type: Number, default: null },
        weekStreak:     { type: Number, default: 0 },
        bestWeekStreak: { type: Number, default: 0 },
      },
      // Whether the nickname may be shown on the public start page; otherwise
      // the player appears there without a name
      publicProfile: { type: Boolean, default: false },
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
  schema.index({ clubs: 1 });
  schema.index({ formerClubs: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('player', schema);
};
