const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { type } = require('express/lib/response');
dotenv.config(); 

const userschema = mongoose.Schema({
    name:{
        required:true,
        type:String
    },
    password:String, 
    email:{
        required:true,
        type:String
    },
    userid:String
})

const usermodel =new  mongoose.model('users',  userschema); 
module.exports = usermodel ; 