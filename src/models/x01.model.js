module.exports = mongoose => {

    var schema = mongoose.Schema(
      {
        gameIsRunning: Boolean,
        isSoloGame: Boolean,
        hasWinner: Boolean,
        startingScore: Number,
        setMode: String,
        legMode: String,
        legInMode: String,
        legOutMode: String,
        numberOfSets: Number,
        numberOfLegs: Number,
        numberOfPlayers: Number,
        startingPlayerLeg: String,
        startingPlayerSet: String,
        currentPlayerTurn: String,
        setsPlayed: Number,
        legsPlayed: Number,
        currentSet: Number,
        currentSetLeg: Number,
        currentThrow: [String],
        currentLegThrows: [{}],
        players: [String],
        allSetsThrows: mongoose.Schema.Types.Mixed,
        playerModels: mongoose.Schema.Types.Mixed
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const X01 = mongoose.model("x01", schema);
    return X01;
};