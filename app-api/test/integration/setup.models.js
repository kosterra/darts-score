// Each integration file gets a fresh module graph, but mongoose itself is one
// externalised singleton: its model registry would still hold the models of the
// file before and db.model.js would throw OverwriteModelError. Start every file
// with an empty registry.
import mongoose from 'mongoose';

for (const name of Object.keys(mongoose.models)) mongoose.deleteModel(name);
