module.exports = mongoose => {

    var schema = mongoose.Schema(
      {
        gameIsRunning: Boolean,
        isSoloGame: Boolean,
        hasWinner: Boolean,
        startingScore: Number,
        numberOfPlayers: Number,
        currentPlayerTurn: String,
        currentThrow: [String],
        allThrows: [{}],
        players: [String],
        playerModels: mongoose.Schema.Types.Mixed
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Cricket = mongoose.model("cricket", schema);
    return Cricket;
};