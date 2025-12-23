module.exports = mongoose => {

  var schema = mongoose.Schema(
    {
      gameIsRunning: Boolean,
      isSoloGame: Boolean,
      hasWinner: Boolean,
      targetScore: Number,
      gameInMode: String,
      gameOutMode: String,
      numberOfPlayers: Number,
      startingPlayer: String,
      currentPlayerTurn: String,
      currentThrow: [String],
      allThrows: [{}],
      players: [String],
      playerModels: mongoose.Schema.Types.Mixed
    },
    { timestamps: true }
  );

  schema.method("toJSON", function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Elimination = mongoose.model("elimination", schema);
  return Elimination;
};