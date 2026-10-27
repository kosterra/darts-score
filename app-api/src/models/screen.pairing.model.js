// A TV paired by its code (see utils/screens.js): it opened /tv and shows a
// code; a member of a club sends a game to it with that code. The TV knows its
// pairing by a secret (its hash kept here), the code is only for sending. Gone
// by itself when it runs out.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      code:       { type: String, required: true },
      secretHash: { type: String, required: true, unique: true },
      // the link of the game the TV shows now (a screen token), or none yet
      gameToken:  { type: String, default: null },
      expiresAt:  { type: Date, required: true },
    },
    { versionKey: false, timestamps: true }
  );
  schema.index({ code: 1 });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return mongoose.model('screenpairing', schema);
};
