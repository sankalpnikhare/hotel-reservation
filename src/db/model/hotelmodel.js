const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const hotelSchema = mongoose.Schema({
    ownername: String,
    ownerid: String,
    hotelName: String,
    location: String,
    address: String,
    price: Number,
    totalRooms: Number,
    photos: [String]
});

const hotelModel = new mongoose.model('hotels', hotelSchema);
module.exports = hotelModel; 