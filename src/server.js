const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongodb_connect = require('./db/db');
const check_credentials = require('./config/check_credentials');
const check_email = require('./config/check_email');
const create_user = require('./services/create_user');
const session = require('express-session');
const sendMail = require('./services/sendMail');
const hash_password = require('./services/hash_password');
const check_password = require('./services/check_password');
const authtoken = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const app = express();


app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: false, // 🔥 change this
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true
    }
}));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));

mongodb_connect();


app.get('/', (req, res) => {
    res.render('register.ejs');
});


app.post('/user', async (req, res) => {
    const { name, email, password } = req.body;

    const valid = check_credentials(name, email, password);
    if (!valid) {
        return res.send("Something is missing");
    }

    const user = await check_email(email);
    if (user) {
        return res.send("Email already taken");
    }

    
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    req.session.user = { name, email, password };
    req.session.otp = otp;

    await sendMail(email, "Code", `Your OTP is ${otp}`);

    return res.redirect('/otp');
});


app.get('/otp', (req, res) => {
    if (!req.session.user) {
        return res.send("Unauthorized");
    }
    res.render('otp');
});


app.post('/otp', async (req, res) => {
    if (req.body.otp !== req.session.otp) {
        return res.send("There was a problem");
    }

    const hashed = await hash_password(req.session.user.password);

    await create_user(
        req.session.user.name,
        req.session.user.email,
        req.session.user.password
    );

    const payload = {
        name: req.session.user.name,
        email: req.session.user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY)

    req.session.token = token;

   
    // req.session.user = null;
    req.session.otp = null;

    return res.redirect('/homepage');
});


app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send("All fields required");
    }

    const user = await check_email(email);
    if (!user) {
        return res.send("No user found");
    }

    const check_pass = await check_password(password, user.password);
    if(!check_pass){
        return res.send("Incorrect password");
    }

    const payload = {
        name: user.name,
        email: user.email
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);

    req.session.token = token;

    return res.redirect('/homepage');
});


app.get('/homepage', authtoken, (req, res) => {
    res.render('homepage');
    console.log("Session:" , req.session);
    
});

app.post('/search' , (req,res)=>{
    console.log(req.body);
    res.render('search')
    
})



app.get('/hotel' ,authtoken  ,  (req,res)=>{
    res.render('hotel')
})

app.post('/hotel' , (req,res)=>{

})
app.listen(5000, () => {
    console.log(`Server listening at port 5000`);
});