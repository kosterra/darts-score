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
      // For the handicap suggestion between players of different ages; required
      // when a player is added or edited, older players may still be without one
      dateOfBirth: { type: Date, default: null },
      // changes the player made to their own date of birth, for fair play;
      // restoredAt once an admin put the earlier date back
      birthChanges: [{
        from:       Date,
        to:         Date,
        at:         { type: Date, default: Date.now },
        restoredAt: { type: Date, default: null },
      }],
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
      // The Hall of Shame, worked out again with the badges: every time one
      // happened (in which club), and the good deeds that washed one off
      shame: [{
        _id: false,
        badge:      { type: String, required: true },
        at:         { type: Date, required: true },
        count:      { type: Number, default: 1 },
        club:       String,
        sourceType: String,
        sourceId:   String,
      }],
      shameWashes: [{
        _id: false,
        badge:      { type: String, required: true },
        at:         { type: Date, required: true },
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
      // the trainings only for the player and the club's admins, not the other players
      privateTrainings: { type: Boolean, default: false },
      // How the player finishes and scores, for the ways out during a game:
      // "auto" learns it from their games, otherwise e.g. "D16" or "T19"
      preferences: {
        favouriteDouble: { type: String, default: 'auto' },
        mainTreble:      { type: String, default: 'auto' },
        // whether the darts fly onto the board to tap (a game may decide for everyone),
        // and how their flights look ('auto': the player's colour in the game)
        flyingDarts:     { type: Boolean, default: true },
        flightColor:     { type: String, default: 'auto' },
        flightPattern:   { type: String, default: 'plain' },
        flightShape:     { type: String, default: 'standard' },
      },
      // the flight shapes and designs unlocked with flight points ("shape:fantail", "design:flames")
      flights: {
        unlocked:        { type: [String], default: [] },
      },
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
    // the date of birth changes are for fair play only
    // eslint-disable-next-line no-unused-vars
    const { _id, birthChanges, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('player', schema);
};
