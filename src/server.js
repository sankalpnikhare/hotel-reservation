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
const multer = require('multer');
const path = require('path');
const hotelModel = require('./db/model/hotelmodel');
const usermodel = require('./db/model/usermodel');
const bcrypt = require('bcrypt');
const { create } = require('domain');
const { nanoid } = require('nanoid');
const bookingmodel = require('./db/model/bookingmodel');




const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const app = express();


app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true
    }
}));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));
// app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongodb_connect();
app.use((req, res, next) => {
    res.locals.user = req.session.name || null;
    next();
});

app.use((req, res, next) => {
    res.locals.email = req.session.email || null
    next();
});
app.use((req, res, next) => {
    res.locals.userid = req.session.userid || null
    next();
});
app.get('/', (req, res) => {
    res.render('homepage');
});


app.get('/register', (req, res) => {
    res.render('register');
})


app.post('/register', async (req, res) => {
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
        req.session.destroy();
        return res.send("Wrong OTP");
    }

    const hashed = await hash_password(req.session.user.password);
    const userid = nanoid();

    await create_user(
        req.session.user.name,
        req.session.user.email,
        req.session.user.password,
        userid
    );

    const payload = {
        name: req.session.user.name,
        email: req.session.user.email,
        
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

    try {
        if (!email || !password) {
            return res.send("All fields required");
        }

        const user = await check_email(email);
        if (!user) {
            return res.send("No user found");
        }

        const check_pass = await check_password(password, user.password);
        if (!check_pass) {
            return res.send("Incorrect password");
        }

        const payload = {
            name: user.name,
            email: user.email,
            ownerid:user.userid
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);
        req.session.name = user.name;
        req.session.email = user.email;
        req.session.userid =  user.userid 

        req.session.token = token;

        return res.redirect('/homepage');

    } catch (err) {
        return res.status(500).send("Error")
    }
});





app.get('/homepage', (req, res) => {
    res.render('homepage');


});

app.post('/search', (req, res) => {

    res.render('search')

})

app.get('/add-user', (req, res) => {
    res.render('add-user');
})

app.post('/add-user', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userid = nanoid(); 
        // console.log(userid);
        
       


        const add = await create_user(name, email, password , userid);
        res.redirect('/') ; 
    } catch (err) {
        return res.status(500).send("Error")
    }

})


app.get('/add-property', authtoken, (req, res) => {
    res.render('hotel')
})

app.get('/hotels', async (req, res) => {
    const location = req.query.location;
    
    req.session.rooms = req.query.rooms;
    req.session.adults = req.query.adults;
    req.session.checkin = req.query.checkin;
    req.session.checkout = req.query.checkout;
    





    try {
        const hotels = await hotelModel.find({
            location: { $regex: location, $options: 'i' }
        });

        res.render('hotels', { hotels, location });
    } catch (err) {
        return res.send("There was an error ")
    }
})



app.post('/add-property', upload.array('hotelPhotos', 4), async (req, res) => {


    try {
        const { hotelName, location, address, totalRooms, price } = req.body;


        const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
        const ownername = req.session.name;
        const user = await check_email(req.session.email);
        const ownerid = user.userid;
        // console.log("The owner id of the listed property is :" , ownerid); //got the owner id 
        





        const newHotel = new hotelModel({
            ownername,
            ownerid,
            hotelName,
            location,
            address,
            price,
            totalRooms,
            photos: imagePaths

        })
        // console.log("Hotel obj" ,  newHotel);
        
        await newHotel.save();

        res.send("Property added successfully")
        // res.redirect('/hotel?success=1');
    } catch (err) {

        res.status(500).send("Error");

    }

});


app.get('/hotel/:id', async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ _id: req.params.id });
        req.session.hotelid = req.params.id;
        // console.log(req.session.hotelid);

        if (!hotel) {
            return res.status(404).send("Hotel not found");
        }
        const session = req.session;
        res.render('hotel-details', { hotel, session });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching hotel details");
    }
});


app.post('/reserve', async (req, res) => {

    try {
        const hotelid = req.body.hotelid;   //Not getting the hotel id 


        const hotel = await hotelModel.find({ _id: hotelid });
        const hotelName = hotel[0].hotelName ; 
        const hotellocation = hotel[0].location ; 
        // console.log(hotellocation);
        


        const ownerid = hotel[0].ownerid;


        const owner = await usermodel.find({ nanoid: ownerid });


        const owneremail = owner[0].email;
        // console.log(owneremail);


        //got the owner email !

        //got the owner email !

        const newBooking = new bookingmodel({
            userEmail: req.session.email,
            hotelName,
            location : hotellocation, 
            rooms: req.body.rooms,
            people: req.body.adults,
            checkin: new Date(req.body.checkin),
            checkout: new Date(req.body.checkout),
            status: "Confirmed"
        });
        await newBooking.save();
        await sendMail(
            owneremail,
            "New Booking",
            `
  <h2>New Booking Request</h2>

  <p><strong>Name:</strong> ${req.body.name}</p>
  <p><strong>Email:</strong> ${req.body.email}</p>

  <hr>

  <p><strong>Rooms:</strong> ${req.body.rooms}</p>
  <p><strong>Adults:</strong> ${req.body.adults}</p>

  <hr>

  <p><strong>Check-in:</strong> ${req.body.checkin}</p>
  <p><strong>Check-out:</strong> ${req.body.checkout}</p>
  `
        );






        res.send("Succ")
    } catch (err) {
        return res.send("Error")
    }




})

app.get('/profile' , authtoken , async(req,res)=>{
    const ownerid = req.session.userid ; 
    


    const listedProperties = await hotelModel.find({ownerid:ownerid})
    const useremail = req.session.email ;
    
    const bookedProperties = await bookingmodel.find({userEmail : useremail})
    res.render('profile' , {listedProperties , bookedProperties})
});
 
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out")
        };
    })

    res.redirect('/');
})
app.listen(5000, () => {
    console.log(`Server listening at port 5000`);
});