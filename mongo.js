const mongoose = require("mongoose");
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = "mongodb+srv://admin:1234@cluster0.89qvg48.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect('mongodb+srv://admin:1234@cluster0.89qvg48.mongodb.net/myportfolio_db?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    firstName: String,
    lastName: String,
    age: Number,
    country: String,
    gender: String,
    role: { type: String, default: 'regular user' }
});
userSchema.statics.hashPassword = async function(password) {
    return await bcrypt.hash(password, 12);
};
const User = mongoose.model("User", userSchema);


let db = null;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("Images");
        console.log("Connected to MongoDB");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
    }
}
// In mongo.js or wherever you establish the MongoDB connection
function getDB() {
    return db;
}
module.exports = { User, connectDB, getDB };


