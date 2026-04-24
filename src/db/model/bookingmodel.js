const mongoose = require('mongoose');

const bookingschema = new mongoose.Schema({
    

    
    
    userEmail:String,
    
    rooms:Number,
    people:Number,

    checkin:Date,
    checkout:Date,

    status:{
        type:String, 
        default:"Pending"
    }
})

const bookingmodel = new mongoose.model('bookings' , bookingschema);

module.exports =  bookingmodel ; 