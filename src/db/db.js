const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function mongodb_connect(){
    mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");
    
}
module.exports = mongodb_connect ; 