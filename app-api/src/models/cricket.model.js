export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      gameIsRunning:     { type: Boolean, default: true },
      isSoloGame:        { type: Boolean, default: false },
      hasWinner:         { type: Boolean, default: false },
      // Cricket starts at 0 points
      startingScore:     { type: Number, min: 0, default: 0 },
      numberOfPlayers:   { type: Number, enum: [1, 2, 3, 4] },
      currentPlayerTurn: String,
      currentThrow:      [String],
      allThrows:         [{}],
      players:           [String],
      playerModels:      mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
  );

  // Used by stats queries and game filter queries
  schema.index({ players: 1, gameIsRunning: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('cricket', schema);
};
