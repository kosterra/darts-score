import { GAME_KINDS } from '../utils/rules.kinds.js';

// A game of the rules engine (Shanghai, Killer, Halve-It, Golf, Tactics): its
// visits as thrown; the app works out everything else from them and keeps the
// result per player in playerModels: { score, rank, hasWonGame, darts }.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      kind:              { type: String, enum: GAME_KINDS, required: true },
      // the setup: e.g. { rounds: 7 } or Killer's { lives, numbers: { playerId: 7 } }
      settings:          { type: mongoose.Schema.Types.Mixed, default: {} },
      gameIsRunning:     { type: Boolean, default: true },
      hasWinner:         { type: Boolean, default: false },
      currentPlayerTurn: String,
      players:           [String],
      // every visit in order: { player, darts: ['T20', 'S5', '0'] }
      visits:            { type: [{ _id: false, player: String, darts: [String] }], default: [] },
      playerModels:      mongoose.Schema.Types.Mixed,
      flyingDarts:       { type: String, enum: ['players', 'on', 'off'], default: 'players' },
    },
    { timestamps: true }
  );

  schema.index({ players: 1, gameIsRunning: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    // the kind is the type the app shows and links to
    object.type = object.kind;
    return object;
  });

  return mongoose.model('rulesgame', schema);
};
