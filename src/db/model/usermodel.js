const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { type } = require('express/lib/response');
dotenv.config(); 

const userschema = mongoose.Schema({
    name:{
        required:true,
        type:String
    },
    password:{
        required:true,
        type:String
    },
    email:{
        required:true,
        type:String
    }
})

const usermodel =new  mongoose.model('users',  userschema); 
module.exports = usermodel ; 