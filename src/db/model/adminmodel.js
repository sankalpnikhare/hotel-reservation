const mongoose = require('mongoose');
const adminschema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        required:true
    }
})

const adminpanel = new mongoose.model('admin' ,adminschema , "admin");
module.exports = adminpanel ; 