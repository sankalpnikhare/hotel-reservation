const express = require("express");
const router = express.Router();

const passport = require("passport");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const check_credentials = require("../config/check_credentials");
const check_email = require("../config/check_email");
const create_user = require("../services/create_user");
const sendMail = require("../services/sendMail");
const hash_password = require("../services/hash_password");
const check_password = require("../services/check_password");



router.get("/register", (req, res) => {
    res.render("register");
});




router.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        const valid = check_credentials(
            name,
            email,
            password
        );

        if (!valid) {
            return res.send("Something is missing");
        }

        const user = await check_email(email);

        if (user) {
            return res.send("Email already taken");
        }

        const otp = Math.floor(
            1000 + Math.random() * 9000
        ).toString();

        req.session.user = {
            name,
            email,
            password
        };

        req.session.otp = otp;

        await sendMail(
            email,
            "Code",
            `Your OTP is ${otp}`
        );

        return res.redirect("/otp");

    } catch (err) {

        console.error(err);
        return res.status(500).send("Error");

    }
});




router.get("/otp", (req, res) => {

    if (!req.session.user) {
        return res.send("Unauthorized");
    }

    res.render("otp");
});



router.post("/otp", async (req, res) => {

    try {

        if (req.body.otp !== req.session.otp) {

            req.session.destroy();

            return res.send("Wrong OTP");
        }

        const hashed = await hash_password(
            req.session.user.password
        );

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

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY
        );

        req.session.token = token;

        req.session.user = {
            name: req.session.user.name,
            email: req.session.user.email,
            userid: userid
        };

        req.session.otp = null;

        return res.redirect("/homepage");

    } catch (err) {

        console.error(err);
        return res.status(500).send("Error");

    }
});




router.get("/login", (req, res) => {
    res.render("login");
});




router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.send("All fields required");
        }

        const user = await check_email(email);

        if (!user) {
            return res.send("No user found");
        }

        const check_pass = await check_password(
            password,
            user.password
        );

        if (!check_pass) {
            return res.send("Incorrect password");
        }

        const payload = {
            name: user.name,
            email: user.email,
            ownerid: user.userid
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY
        );

        req.session.token = token;

        req.session.user = {
            name: user.name,
            email: user.email,
            userid: user.userid
        };

        return res.redirect("/homepage");

    } catch (err) {

        console.error(err);
        return res.status(500).send("Error");

    }
});



router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["email", "profile"]
    })
);



router.get(
    "/auth/google/callback",

    passport.authenticate("google", {
        failureRedirect: "/login"
    }),

    async (req, res) => {

        try {

            const profile = req.user;

            const email =
                profile.emails?.[0]?.value ||
                profile.email;

            const name =
                profile.displayName ||
                profile.name?.givenName ||
                "Google User";

            if (!email) {
                return res.redirect("/login");
            }

            let user = await check_email(email);

            // User doesn't exist
            if (!user) {

                const userid = nanoid();

                const created = await create_user(
                    name,
                    email,
                    null,
                    userid
                );

                if (!created) {

                    console.error(
                        "Google OAuth: failed to create user for",
                        email
                    );

                    return res.redirect("/login");
                }

                user = await check_email(email);
            }

            if (!user) {
                return res.redirect("/login");
            }

            const payload = {
                name: user.name,
                email: user.email,
                ownerid: user.userid
            };

            req.session.token = jwt.sign(
                payload,
                process.env.JWT_SECRET_KEY
            );

            req.session.user = {
                name: user.name,
                email: user.email,
                userid: user.userid
            };

            return res.redirect("/homepage");

        } catch (err) {

            console.error(err);
            return res.redirect("/login");

        }
    }
);




router.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.send("Error logging out");
        }

        res.redirect("/");

    });

});


module.exports = router;