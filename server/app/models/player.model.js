module.exports = mongoose => {

    var schema = mongoose.Schema(
      {
        firstname: String,
        lastname: String,
        nickname: String,
        nbrOfMatches: Number,
        matchesWon: Number,
        soloGames: Number,
        totalThrow: {
          darts: Number,
          rounds: Number
        },
        totalThrowEndGame: {
          darts: Number,
          rounds: Number
        },
        totalThrowBegMidGame: {
          darts: Number,
          rounds: Number
        },
        bestThreeDarts: Number,
        hit: Object,
        scoreRanges: Object,
        averages: Object,
        checkout: Object,
        checkoutScores: Object,
        matches: [{}]
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Player = mongoose.model("player", schema);
    return Player;
};