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
const usermodel = require("../db/model/usermodel");
const adminpanel = require("../db/model/adminmodel");
const hotelModel = require("../db/model/hotelmodel");
const { redirect } = require("express/lib/response");
const admin_check = require("../middleware/admin_middleware");






router.get("/register", (req, res) => {

    if (req.session.pendinguser && req.session.otp) {


        return res.render('otp.ejs');


    }

    return res.render("register");
});




router.post("/register", async (req, res) => {

    if (req.session.pendinguser && req.session.otp) {
        if (req.body.otp !== req.session.otp) {
            req.session.destroy();
            return res.status(400).send("Invalid OTP")

        }
        const userid = nanoid();

        await create_user(
            req.session.pendinguser.name,
            req.session.pendinguser.email,
            req.session.pendinguser.password,
            userid
        );

        const payload = {
            name: req.session.pendinguser.name,
            email: req.session.pendinguser.email,
            ownerid: userid
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY
        );

        req.session.token = token;

        req.session.user = {
            name: req.session.pendinguser.name,
            email: req.session.pendinguser.email,
            userid: userid
        };

        req.session.otp = null;

        return res.redirect("/homepage");


    }


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

    req.session.pendinguser = {
        name,
        email,
        password
    };

    req.session.otp = otp;


    await sendMail(
        email,
        "StayEase - Verification Code", ` <div style=" font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin: 0 auto; background-color: #f5f7fa; padding: 30px 20px; color: #333; "> <!-- Header --> <div style=" background-color: #2563eb; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; "> <h1 style=" color: white; margin: 0; font-size: 28px; "> StayEase </h1> <p style=" color: #dbeafe; margin: 8px 0 0; font-size: 14px; "> Hotel Reservation System </p> </div> <!-- Content --> <div style=" background-color: white; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; "> <h2 style=" margin-top: 0; color: #111827; "> Verify Your Email </h2> <p style=" color: #6b7280; font-size: 15px; line-height: 1.6; "> Use the verification code below to continue with your StayEase account. </p> <!-- OTP --> <div style=" margin: 25px 0; padding: 18px; background-color: #eff6ff; border-radius: 8px; "> <p style=" margin: 0 0 8px; color: #6b7280; font-size: 13px; "> Your verification code </p> <div style=" font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; "> ${otp} </div> </div> <p style=" color: #6b7280; font-size: 13px; line-height: 1.5; "> This code is valid for a limited time. If you did not request this code, you can safely ignore this email. </p> <hr style=" border: none; border-top: 1px solid #e5e7eb; margin: 25px 0; "> <p style=" margin: 0; color: #9ca3af; font-size: 12px; "> This is an automated email from StayEase.<br> Please do not reply to this email. </p> </div> </div> `
    );

    res.redirect('register')





});








router.get("/login", (req, res) => {
    res.render("login");
});


router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;


        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const user = await check_email(email);


        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Incorrect email or password"
            });
        }


        if (user.LoginAttempts > 4) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Please try again later."
            });
        }


        const check_pass = await check_password(
            password,
            user.password
        );

        if (!check_pass) {

            await usermodel.findByIdAndUpdate(
                user._id,
                {
                    $inc: {
                        LoginAttempts: 1
                    }
                }
            );



            return res.status(401).json({
                success: false,
                message: "Incorrect email or password"
            });
        }


        await usermodel.findByIdAndUpdate(
            user._id,
            {
                $set: {
                    LoginAttempts: 0
                }
            }
        );


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


        return res.status(200).json({
            success: true,
            redirect: "/homepage"
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

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

router.get('/resetpassword', (req, res) => {
    if (req.session.resetpassword) {
        return res.render('reset-password.ejs')
    }
    if (req.session.otp && req.session.useremail) {
        return res.render('reset-pass-otp.ejs')
    }

    res.render("reset-password-request.ejs");
});


router.post('/resetpassword', async (req, res) => {
    if (req.session.resetpassword) {
        const password = req.body.password;
        const hashedPassword = await hash_password(password);

        const updatedUser = await usermodel.findOneAndUpdate(
            { email: req.session.useremail },
            { $set: { password: hashedPassword } },
            { returnDocument: "after" }
        );
        req.session.destroy();
        

        return res.send("Successfully Password Reset !")

    }
    if (req.session.useremail && req.session.otp && req.body.otp) {
        if (req.body.otp !== req.session.otp) {
            return res.status(400).send("Invalid OTP")
        }
        req.session.resetpassword = true;
        return res.redirect('/resetpassword');

    }


    const user = await check_email(req.body.email);
    if (!user) {
        return res.status(400).send('No user witht this email found !');
    }
    const otp = Math.floor(
        1000 + Math.random() * 9000
    ).toString();
    req.session.useremail = req.body.email;

    req.session.otp = otp;
    await sendMail(
        req.body.email,
        "StayEase - Reset Password", ` <div style=" font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin: 0 auto; background-color: #f5f7fa; padding: 30px 20px; color: #333; "> <!-- Header --> <div style=" background-color: #2563eb; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; "> <h1 style=" color: white; margin: 0; font-size: 28px; "> StayEase </h1> <p style=" color: #dbeafe; margin: 8px 0 0; font-size: 14px; "> Hotel Reservation System </p> </div> <!-- Content --> <div style=" background-color: white; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; "> <h2 style=" margin-top: 0; color: #111827; "> Verify Your Email </h2> <p style=" color: #6b7280; font-size: 15px; line-height: 1.6; "> Use the verification code below to continue with your StayEase account. </p> <!-- OTP --> <div style=" margin: 25px 0; padding: 18px; background-color: #eff6ff; border-radius: 8px; "> <p style=" margin: 0 0 8px; color: #6b7280; font-size: 13px; "> Your verification code </p> <div style=" font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; "> ${otp} </div> </div> <p style=" color: #6b7280; font-size: 13px; line-height: 1.5; "> This code is valid for a limited time. If you did not request this code, you can safely ignore this email. </p> <hr style=" border: none; border-top: 1px solid #e5e7eb; margin: 25px 0; "> <p style=" margin: 0; color: #9ca3af; font-size: 12px; "> This is an automated email from StayEase.<br> Please do not reply to this email. </p> </div> </div> `
    );


    res.redirect('/resetpassword');



})





router.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.send("Error logging out");
        }

        res.redirect("/");

    });

});

router.get('/adminpanel', (req, res) => {
    res.render('admin-panel.ejs');

})
router.post('/adminpanel', async (req, res) => {

    try {
        const { username, password } = req.body;
        // console.log("Auth_routes: req.body ::" , req.body); 
        
        async function check_admin(username) {
            const user = await adminpanel.findOne({ username: username });
            if (user) {
                
                return user;

            }
            
            return false;
        }

        const user = await check_admin(username); //Calling the function here 
        
        

        if (!user) {
            res.status(404).json({
                status: "unsucc",
                message: "No Admin found with this email"
            })
        }
        const checkpassword = await check_password(
            password,
            user.password
        )
        if (!checkpassword) {
            return res.status(400).json({
                status: "Unsucc",
                message: "Wrong Password"
            })
        }

        const payload = {
            username: username,
            role: user.role

        };
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY
        );
        req.session.token = token
        req.session.user = {
            username: username,
            role: user.role
        }
        
        

        return res.status(200).redirect('/admin-page');

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. PLease try later again"
        });
    }


})

router.get("/admin-page",admin_check ,  async (req, res) => {
    try {
        const hotels = await hotelModel.find();
        const users = await usermodel.find();
        res.render("admin-page", { hotels, users });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading admin page");
    }
});

router.delete("/admin/hotels/:id", admin_check ,  async (req, res) => {
    try {
        const hotel = await hotelModel.findByIdAndDelete(req.params.id);
        if (!hotel) return res.status(404).send("Hotel not found");
        res.status(200).send("Hotel deleted");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting hotel");
    }
});

router.delete("/admin/users/:id" , admin_check ,  async (req, res) => {
    try {
        const user = await usermodel.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).send("User not found");
        res.status(200).send("User deleted");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting user");
    }
});




module.exports = router;