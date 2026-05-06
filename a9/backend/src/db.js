const { MongoClient } = require('mongodb');

const prn = process.env.PRN || '23510081';
const mongoDbName = `prn_${prn}`;

let mongoClient;
let mongoDb;

async function initMongo() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(mongoDbName);
  await mongoDb.collection('students').createIndex({ email: 1 }, { unique: true });
}

async function initDatabases() {
  await initMongo();
}

function getMongoCollection() {
  return mongoDb.collection('students');
}

module.exports = {
  initDatabases,
  getMongoCollection,
  mongoDbName
};
