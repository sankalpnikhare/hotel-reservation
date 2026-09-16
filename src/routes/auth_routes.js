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
            "StayEase - Verification Code", ` <div style=" font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin: 0 auto; background-color: #f5f7fa; padding: 30px 20px; color: #333; "> <!-- Header --> <div style=" background-color: #2563eb; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; "> <h1 style=" color: white; margin: 0; font-size: 28px; "> StayEase </h1> <p style=" color: #dbeafe; margin: 8px 0 0; font-size: 14px; "> Hotel Reservation System </p> </div> <!-- Content --> <div style=" background-color: white; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; "> <h2 style=" margin-top: 0; color: #111827; "> Verify Your Email </h2> <p style=" color: #6b7280; font-size: 15px; line-height: 1.6; "> Use the verification code below to continue with your StayEase account. </p> <!-- OTP --> <div style=" margin: 25px 0; padding: 18px; background-color: #eff6ff; border-radius: 8px; "> <p style=" margin: 0 0 8px; color: #6b7280; font-size: 13px; "> Your verification code </p> <div style=" font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; "> ${otp} </div> </div> <p style=" color: #6b7280; font-size: 13px; line-height: 1.5; "> This code is valid for a limited time. If you did not request this code, you can safely ignore this email. </p> <hr style=" border: none; border-top: 1px solid #e5e7eb; margin: 25px 0; "> <p style=" margin: 0; color: #9ca3af; font-size: 12px; "> This is an automated email from StayEase.<br> Please do not reply to this email. </p> </div> </div> `
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