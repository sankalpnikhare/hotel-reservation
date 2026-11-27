const mongoose = require('mongoose');

const bookingschema = new mongoose.Schema({




    userEmail: String,
    hotelName: String,
    location: String,

    rooms: Number,
    people: Number,

    hotel_id: String,


    checkin: Date,
    checkout: Date,



    status: {
        type: String,
        default: "Pending"
    },

    expiresAt: Date
})


bookingschema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const bookingmodel = new mongoose.model('bookings', bookingschema);

module.exports = bookingmodel; 