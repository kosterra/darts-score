import { TRAINING_KINDS } from '../utils/rules.kinds.js';

// A training of the rules engine (Bob's 27, 121 Checkout, …), saved once it is
// over: its darts, its score (which ranks the attempts) and the result.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:     { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      kind:     { type: String, enum: TRAINING_KINDS, required: true },
      settings: { type: mongoose.Schema.Types.Mixed, default: {} },
      // every dart: 'T20', 'D16', '0', or 'H' and 'M' for a hit or a miss
      darts:    { type: [String], default: [] },
      score:    { type: Number, required: true },
      // what the app worked out, e.g. { score, done, attempts }
      result:   { type: mongoose.Schema.Types.Mixed, default: {} },
      // when it started, as the app says, for fair play (darts faster than they can be thrown)
      startedAt: { type: Date, default: null },
      // { id, nickname }: the nickname for when the player is deleted later
      player:   mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
  );

  schema.index({ kind: 1, 'player.id': 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('rulestraining', schema);
};
