// A connection between two clubs: once accepted, either club can invite the
// other into a shared tournament (see utils/club.links.js and tournaments).
// An admin of one club asks, an admin of the other accepts. The pair is kept
// sorted so a connection is stored once, whichever side asked.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // the two clubs, always sorted by id, so "connections of a club" is a simple query
      clubs:         { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true }], required: true, index: true },
      // the sorted pair as "<idA>_<idB>", so one connection per pair whichever side asked
      pair:          { type: String, required: true, unique: true },
      // who asked and from which club, with the name for when the account is gone later
      requestedClub: { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      requestedByName: String,
      // 'pending', then 'accepted'
      status:        { type: String, enum: ['pending', 'accepted'], default: 'pending', index: true },
      decidedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      decidedByName: String,
      // when it was accepted
      since:         { type: Date, default: null },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('clublink', schema);
};
