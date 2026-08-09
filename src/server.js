const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;

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
const { log } = require('console');




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
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));
// app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongodb_connect();
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
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
    // if(sendMail){
    //     console.log("Otp sent !!!");

    // }
    console.log(sendMail);


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
        hashed,
        userid
    );

    const payload = {
        name: req.session.user.name,
        email: req.session.user.email,
        ownerid: userid
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);

    req.session.token = token;

    req.session.user = {
        name: req.session.user.name,
        email: req.session.user.email,
        userid: userid
    };

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
            ownerid: user.userid
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);

        req.session.token = token;

        req.session.user = {
            name: user.name,
            email: user.email,
            userid: user.userid
        };

        return res.redirect('/homepage');

    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
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





        const add = await create_user(name, email, password, userid);
        res.redirect('/');
    } catch (err) {
        return res.status(500).send("Error")
    }

})


app.get('/add-property', authtoken, (req, res) => {
    res.render('hotel')
})

app.get('/hotels', async (req, res) => {
    const location = req.query.location;
    const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;

    req.session.rooms = req.query.rooms;
    req.session.adults = req.query.adults;
    req.session.checkin = req.query.checkin;
    req.session.checkout = req.query.checkout;






    try {
        const query = {
            location: { $regex: location, $options: 'i' }
        };

        const priceFilter = {};
        if (minPrice != null && !isNaN(minPrice)) priceFilter.$gte = minPrice;
        if (maxPrice != null && !isNaN(maxPrice)) priceFilter.$lte = maxPrice;
        if (Object.keys(priceFilter).length) query.price = priceFilter;

        const hotels = await hotelModel.find(query);

        res.render('hotels', {
            hotels,
            location,
            minPrice: req.query.minPrice || '',
            maxPrice: req.query.maxPrice || ''
        });
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


        await newHotel.save();

        res.send("Property added successfully")

    } catch (err) {

        res.status(500).send("Error");

    }

});


app.get('/hotel/:id', async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ _id: req.params.id });
        req.session.hotelid = req.params.id;


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
        const hotelid = req.body.hotelid;




        const hotel = await hotelModel.find({ _id: hotelid });
        const hotelName = hotel[0].hotelName;
        const hotellocation = hotel[0].location;




        const ownerid = hotel[0].ownerid;


        const owner = await usermodel.find({ nanoid: ownerid });


        const owneremail = owner[0].email;



        const newBooking = new bookingmodel({
            userEmail: req.session.email,
            hotelName,
            location: hotellocation,
            rooms: req.body.rooms,
            people: req.body.adults,
            checkin: new Date(req.body.checkin),
            checkout: new Date(req.body.checkout),
            status: "Confirmed",
            hotel_id: hotelid
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

app.get('/profile', authtoken, async (req, res) => {

    const ownerid = req.session.user.userid;

    const listedProperties = await hotelModel.find({
        ownerid: ownerid
    });

    const rawBookings = await bookingmodel.find({
        userEmail: req.session.user.email
    });

    // Enrich bookings with hotel photos for the card UI
    const bookedProperties = await Promise.all(
        rawBookings.map(async (booking) => {
            const bookingObj = booking.toObject();
            try {
                const hotel = await hotelModel.findById(booking.hotel_id);
                if (hotel) {
                    bookingObj.hotelPhotos = hotel.photos || [];
                    bookingObj.hotelLocation = hotel.location || booking.location || '';
                    bookingObj.hotelPrice = hotel.price || null;
                }
            } catch (e) {
                bookingObj.hotelPhotos = [];
                bookingObj.hotelLocation = booking.location || '';
            }
            return bookingObj;
        })
    );

    // Calculate dashboard statistics if the user has listed properties
    let dashboardStats = null;
    let hostBookings = [];

    if (listedProperties && listedProperties.length > 0) {
        const hotelIds = listedProperties.map(hotel => hotel._id.toString());
        const rawHostBookings = await bookingmodel.find({ hotel_id: { $in: hotelIds } });

        let totalRevenue = 0;
        let totalRoomsBooked = 0;

        hostBookings = await Promise.all(
            rawHostBookings.map(async (booking) => {
                const bookingObj = booking.toObject();
                const hotel = listedProperties.find(h => h._id.toString() === booking.hotel_id);
                if (hotel) {
                    bookingObj.hotelName = hotel.hotelName;
                    bookingObj.hotelPrice = hotel.price;
                    bookingObj.hotelPhotos = hotel.photos || [];
                    
                    const nights = Math.max(1, Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / (1000 * 60 * 60 * 24)));
                    const revenue = (hotel.price || 0) * (booking.rooms || 1) * nights;
                    bookingObj.revenue = revenue;
                    bookingObj.nights = nights;
                    
                    totalRevenue += revenue;
                } else {
                    bookingObj.revenue = 0;
                    bookingObj.nights = 1;
                }
                totalRoomsBooked += booking.rooms || 0;
                return bookingObj;
            })
        );

        dashboardStats = {
            totalProperties: listedProperties.length,
            totalBookings: rawHostBookings.length,
            totalRevenue,
            totalRoomsBooked
        };
    }

    res.render('profile', {
        user: req.session.user,
        listedProperties,
        bookedProperties,
        dashboardStats,
        hostBookings
    });
});

app.delete('/delete-property/:id', authtoken, async (req, res) => {
    try {
        const hotelId = req.params.id;
        const ownerid = req.session.userid;

        const hotel = await hotelModel.findById(hotelId);
        if (!hotel) {
            return res.status(404).send("Property not found");
        }

        if (hotel.ownerid !== ownerid) {
            return res.status(403).send("Unauthorized");
        }

        await hotelModel.findByIdAndDelete(hotelId);
        res.status(200).send("Property deleted successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting property");
    }
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