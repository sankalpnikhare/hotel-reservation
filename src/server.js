const mongoose = require("mongoose");
require("dotenv").config();

const passport = require("passport");
const GoogleStrategy =
    require("passport-google-oauth2").Strategy;

const express = require("express");
const path = require("path");
const session = require("express-session");

const mongodb_connect =
    require("./db/db");



const authRoutes =
    require("./routes/auth_routes");

const pageRoutes =
    require("./routes/page_routes");

const hotelRoutes =
    require("./routes/hotel_routes");

const bookingRoutes =
    require("./routes/booking_routes");

const userRoutes =
    require("./routes/user_routes");




const app = express();




app.use(
    session({

        secret: "mysecretkey",

        resave: false,

        saveUninitialized: false,

        cookie: {

            maxAge:
                1000 * 60 * 60,

            httpOnly: true

        }

    })
);



app.use(
    passport.initialize()
);

app.use(
    passport.session()
);


passport.use(

    new GoogleStrategy(

        {

            clientID:
                process.env.GOOGLE_CLIENT_ID,

            clientSecret:
                process.env.GOOGLE_CLIENT_SECRET,

            callbackURL:
                "http://localhost:5000/auth/google/callback"

        },

        (
            accessToken,
            refreshToken,
            profile,
            done
        ) => {

            return done(
                null,
                profile
            );

        }

    )

);


passport.serializeUser(
    (user, done) =>
        done(null, user)
);

passport.deserializeUser(
    (user, done) =>
        done(null, user)
);




app.set(
    "view engine",
    "ejs"
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    express.json()
);




app.use(
    express.static(
        __dirname + "/public"
    )
);


app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "public/uploads"
        )
    )
);




mongodb_connect();




app.use(
    (req, res, next) => {

        res.locals.user =
            req.session.user || null;

        res.locals.email =
            req.session.email || null;

        res.locals.userid =
            req.session.userid || null;

        next();

    }
);




app.use(authRoutes);

app.use(pageRoutes);

app.use(hotelRoutes);

app.use(bookingRoutes);

app.use(userRoutes);




if (
    process.env.NODE_ENV !== "production"
) {

    const devRoutes =
        require("./routes/dev_routes");

    app.use(devRoutes);

}



app.listen(
    5000,
    () => {

        console.log(
            "Server listening at port 5000"
        );

    }
);