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
const session = require('express-session');
const sendMail = require('./services/sendMail');
const hash_password = require('./services/hash_password');








const app = express() ; 
app.use(session({
    secret: 'mysecretkey',   
    resave: false,
    saveUninitialized: true
}));
app.set('view engine' , 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.json());
mongodb_connect(); 

app.get('/' ,(req,res)=>{
    res.render('register.ejs');

})
let otp ; 

app.post('/user', async (req,res)=>{
    const {name, email , password} = req.body ; 
    const valid = check_credentials(name, email , password);
    if(!valid){
        res.send("Something is missing")
    }
    if(!check_email(email)){
        res.send("Email already taken")
    }
    req.session.user = {name,email,password};
    res.redirect('/otp');

    
    
})

app.get('/otp' , (req,res)=>{
    let otp = Math.floor(1000 + Math.random() * 9000).toString(); 
    
    req.session.otp = otp  ;
    
    sendMail(req.session.user.email , "Code" , otp);
    res.render('otp'); 


})
app.post('/otp' , async (req,res)=>{
    if(req.body.otp === req.session.otp){
        // const hash = await hash_password(req.session.user.password); 
        const create = await create_user(req.session.user.name , req.session.user.email ,req.session.user.password);
        res.send("Succ")
    }
    res.send("There was a problem")
    
    
});

app.get('/homepage' , (req,res)=>{

})







app.listen( 5000 , ()=>{
    console.log(`Server listening at port `);
    
})