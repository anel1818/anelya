// imageModel.js
const { getDB } = require('./mongo');
const { ObjectId } = require('mongodb');

const collectionName = "images";

async function addImage({ name, url, description }) {
    const db = getDB();
    return await db.collection(collectionName).insertOne({ name, url, description });
}


async function updateImage(id, { name, url, description }) {
    const db = getDB(); 
    return db.collection('images').updateOne({ _id: new ObjectId(id) }, { $set: { name, url, description } });
}


async function deleteImage(id) {
    const db = getDB();
    return await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
}

async function fetchImages() {
    const db = getDB();
    return await db.collection(collectionName).find({}).toArray();
}

module.exports = { addImage, updateImage, deleteImage, fetchImages };