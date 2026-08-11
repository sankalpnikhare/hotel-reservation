const express = require("express");
const router = express.Router();

const hotelModel = require("../db/model/hotelmodel");
const usermodel = require("../db/model/usermodel");
const bookingmodel = require("../db/model/bookingmodel");

const sendMail = require("../services/sendMail");




router.post(
    "/reserve",
    async (req, res) => {

        try {

            const hotelid =
                req.body.hotelid;


            // Find hotel

            const hotel =
                await hotelModel.find({
                    _id: hotelid
                });


            const hotelName =
                hotel[0].hotelName;

            const hotellocation =
                hotel[0].location;


            const ownerid =
                hotel[0].ownerid;


            // Find hotel owner

            const owner =
                await usermodel.find({
                    nanoid: ownerid
                });


            const owneremail =
                owner[0].email;


            // Create booking

            const newBooking =
                new bookingmodel({

                    userEmail:
                        req.session.user.email,

                    hotelName,

                    location:
                        hotellocation,

                    rooms:
                        req.body.rooms,

                    people:
                        req.body.adults,

                    checkin:
                        new Date(
                            req.body.checkin
                        ),

                    checkout:
                        new Date(
                            req.body.checkout
                        ),

                    status:
                        "Confirmed",

                    hotel_id:
                        hotelid

                });


            await newBooking.save();


            // Send email to hotel owner

            await sendMail(

                owneremail,

                "New Booking",

                `
                <h2>New Booking Request</h2>

                <p>
                    <strong>Name:</strong>
                    ${req.body.name}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${req.body.email}
                </p>

                <hr>

                <p>
                    <strong>Rooms:</strong>
                    ${req.body.rooms}
                </p>

                <p>
                    <strong>Adults:</strong>
                    ${req.body.adults}
                </p>

                <hr>

                <p>
                    <strong>Check-in:</strong>
                    ${req.body.checkin}
                </p>

                <p>
                    <strong>Check-out:</strong>
                    ${req.body.checkout}
                </p>
                `

            );


            res.send("Succ");


        } catch (err) {

            console.error(err);

            return res.send(
                "Error"
            );

        }

    }
);


module.exports = router;