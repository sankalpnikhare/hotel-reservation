const mongoose = require('mongoose')
const dotenv = require('dotenv');
dotenv.config(); 
const express = require('express');
const mongodb_connect = require('./db/db');
const usermodel = require('./db/model/usermodel');
const check_credentials = require('./config/check_credentials');
const { PassThrough } = require('nodemailer/lib/xoauth2');
const check_email = require('./config/check_email');
const create_user = require('./services/create_user');





const app = express() ; 

app.set('view engine' , 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.json());
mongodb_connect(); 

app.get('/' ,(req,res)=>{
    res.render('register.ejs');

})

app.post('/user', async (req,res)=>{
    const {name, email , password} = req.body ; 
    const valid = check_credentials(name, email , password);
    if(!valid){
        res.send("Something is missing")
    }
    if(!check_email(email)){
        res.send("Email already taken")
    }
    const create = await create_user(name,email,password);
    if(!create){
        res.send("User not created")
    }
    res.send("User created succ")
})

console.log(process.env.PORT);



app.listen( 5000 , ()=>{
    console.log(`Server listening at port `);
    
})