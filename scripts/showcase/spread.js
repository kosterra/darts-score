// mongosh: spreads the finished demo games over the club evenings (Tuesday
// and Thursday from 7.30 pm) of the weeks before, newest last
const evenings = [];
for (let day = new Date(); evenings.length < 40; day = new Date(day.getTime() - 864e5)) {
    if ([2, 4].includes(day.getDay())) evenings.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 30));
}
evenings.shift();
for (const name of ['x01', 'crickets', 'eliminations', 'clocks']) {
    const games = db.getCollection(name).find({ hasWinner: true }).sort({ createdAt: -1 }).toArray();
    games.forEach((game, index) => {
        const evening = evenings[Math.floor(index / 2)];
        const start = new Date(evening.getTime() + (index % 2) * 40 * 60 * 1000);
        const end = new Date(start.getTime() + 25 * 60 * 1000);
        db.getCollection(name).updateOne({ _id: game._id }, { $set: { createdAt: start, updatedAt: end } });
    });
    print(`${name}: ${games.length} games spread`);
}
