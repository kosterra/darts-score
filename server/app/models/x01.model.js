module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        score: Number,
        legMode: String,
        legInMode: String,
        legOutMode: String,
        setMode: String,
        numberOfLegs: Number,
        numberOfSets: Number,
        numberOfPlayers: Number,
        players: [String]
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