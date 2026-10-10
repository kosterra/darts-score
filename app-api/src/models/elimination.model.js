const IN_MODES  = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      gameIsRunning:     { type: Boolean, default: true },
      isSoloGame:        { type: Boolean, default: false },
      hasWinner:         { type: Boolean, default: false },
      targetScore:       { type: Number, min: 1 },
      gameInMode:        { type: String, enum: IN_MODES },
      gameOutMode:       { type: String, enum: OUT_MODES },
      numberOfPlayers:   { type: Number, enum: [1, 2, 3, 4] },
      startingPlayer:    String,
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

  return mongoose.model('elimination', schema);
};
