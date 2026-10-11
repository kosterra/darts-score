// Account-wide roles. What a user may do inside a club is decided per club:
// they are one of its admins, or they are linked to one of its players.
export const ROLES = { GLOBAL_ADMIN: 'globalAdmin', USER: 'user' };
export const CLUB_ROLES = { ADMIN: 'admin', PLAYER: 'player' };

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash:   { type: String, required: true },
      firstname:      { type: String, required: true, trim: true },
      lastname:       { type: String, required: true, trim: true },
      role:           { type: String, enum: Object.values(ROLES), default: ROLES.USER },
      // Bumped on password change so older session cookies stop working
      sessionVersion: { type: Number, default: 0 },
      // Hash of the token from a "set your password" mail, and when it stops working
      resetTokenHash:    { type: String, default: null, index: true },
      resetTokenExpires: { type: Date, default: null },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { _id, passwordHash, sessionVersion, resetTokenHash, resetTokenExpires, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('user', schema);
};
