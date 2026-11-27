const express = require("express");
const router = express.Router();

const hotelModel = require("../db/model/hotelmodel");
const usermodel = require("../db/model/usermodel");
const bookingmodel = require("../db/model/bookingmodel");

const sendMail = require("../services/sendMail");
const authtoken = require("../middleware/auth");





router.post(
    "/reserve", authtoken,
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
                    userid: ownerid
                });




            const owneremail =
                owner[0].email;





            // Create booking
            const expiresAt = new Date(
                new Date(req.body.checkout).getTime() + 24 * 60 * 60 * 1000
            );

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
                        "Pending",

                    hotel_id:
                        hotelid,

                    expiresAt: new Date("2026-09-24T00:00:00.000Z")

                });


            await newBooking.save();
            
            
            


            // Send email to hotel owner

            // await sendMail(

            //     owneremail,

            //     "🏨 StayEase - New Booking Received", ` <div style=" font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f7fa; padding: 30px 20px; color: #333; "> <!-- Header --> <div style=" background-color: #2563eb; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; "> <h1 style=" color: white; margin: 0; font-size: 28px; "> StayEase </h1> <p style=" color: #dbeafe; margin: 8px 0 0; font-size: 14px; "> Hotel Reservation System </p> </div> <!-- Main Content --> <div style=" background-color: white; padding: 30px; border-radius: 0 0 10px 10px; "> <h2 style=" margin-top: 0; color: #111827; "> 🎉 New Booking Received </h2> <p style=" color: #6b7280; line-height: 1.6; "> You have received a new booking request for your property. Here are the booking details: </p> <!-- Guest Details --> <div style=" margin-top: 25px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #2563eb; "> <h3 style=" margin-top: 0; color: #111827; "> 👤 Guest Details </h3> <p style="margin: 8px 0;"> <strong>Name:</strong> ${req.session.user.name} </p> <p style="margin: 8px 0;"> <strong>Email:</strong> ${req.session.user.email} </p> </div> <!-- Booking Details --> <div style=" margin-top: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; "> <h3 style=" margin-top: 0; color: #111827; "> 🏨 Booking Details </h3> <p style="margin: 8px 0;"> <strong>Rooms:</strong> ${req.body.rooms} </p> <p style="margin: 8px 0;"> <strong>Adults:</strong> ${req.body.adults} </p> </div> <!-- Stay Details --> <div style=" margin-top: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b; "> <h3 style=" margin-top: 0; color: #111827; "> 📅 Stay Details </h3> <p style="margin: 8px 0;"> <strong>Check-in:</strong> ${req.body.checkin} </p> <p style="margin: 8px 0;"> <strong>Check-out:</strong> ${req.body.checkout} </p> </div> <!-- Action --> <div style=" margin-top: 30px; padding: 15px; background-color: #eff6ff; border-radius: 8px; text-align: center; "> <p style=" margin: 0; color: #1e40af; font-size: 14px; "> Please review this booking request and take the necessary action. </p> </div> <!-- Footer --> <p style=" margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; "> This is an automated email from StayEase.<br> Please do not reply directly to this email. </p> </div> </div> `

            // );


            return res.redirect("/booking-status/" + newBooking._id);


        } catch (err) {

            console.error(err);

            return res.send(
                "Error"
            );

        }

    }
);


router.post("/booking/:id/status", authtoken, async (req, res) => {
    try {
        const status = req.body.status;
        if (status !== "Confirmed" && status !== "Rejected") {
            return res.status(400).send("Invalid status");
        }

        const booking = await bookingmodel.findById(req.params.id);
        if (!booking) {
            return res.status(404).send("Booking not found");
        }

        const hotel = await hotelModel.findById(booking.hotel_id);
        if (!hotel || hotel.ownerid !== req.session.user.userid) {
            return res.status(403).send("Unauthorized");
        }

        booking.status = status;
        await booking.save();

        if (status === "Confirmed") {
            const checkinDate = booking.checkin
                ? new Date(booking.checkin).toLocaleDateString()
                : "";
            const checkoutDate = booking.checkout
                ? new Date(booking.checkout).toLocaleDateString()
                : "";

            await sendMail(
                booking.userEmail,
                "StayEase - Booking Confirmed",
                ` <div style=" font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f7fa; padding: 30px 20px; color: #333; "> <div style=" background-color: #2563eb; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; "> <h1 style=" color: white; margin: 0; font-size: 28px; "> StayEase </h1> <p style=" color: #dbeafe; margin: 8px 0 0; font-size: 14px; "> Hotel Reservation System </p> </div> <div style=" background-color: white; padding: 30px; border-radius: 0 0 10px 10px; "> <h2 style=" margin-top: 0; color: #111827; "> Booking Confirmed </h2> <p style=" color: #6b7280; line-height: 1.6; "> Your booking request has been confirmed by the hotel. Here are your stay details: </p> <div style=" margin-top: 25px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; "> <h3 style=" margin-top: 0; color: #111827; "> Stay Details </h3> <p style="margin: 8px 0;"> <strong>Hotel:</strong> ${booking.hotelName} </p> <p style="margin: 8px 0;"> <strong>Location:</strong> ${booking.location || hotel.location || ""} </p> <p style="margin: 8px 0;"> <strong>Rooms:</strong> ${booking.rooms} </p> <p style="margin: 8px 0;"> <strong>Guests:</strong> ${booking.people} </p> <p style="margin: 8px 0;"> <strong>Check-in:</strong> ${checkinDate} </p> <p style="margin: 8px 0;"> <strong>Check-out:</strong> ${checkoutDate} </p> </div> <p style=" margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; "> This is an automated email from StayEase.<br> Please do not reply directly to this email. </p> </div> </div> `
            );
        }

        return res.status(200).send("Updated");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
    }
});


router.get("/booking-status/:id", authtoken, async (req, res) => {
    try {
        const booking = await bookingmodel.findById(req.params.id);

        if (!booking) {
            return res.status(404).send("Booking not found");
        }

        if (booking.userEmail !== req.session.user.email) {
            return res.status(403).send("Unauthorized");
        }

        const hotel = await hotelModel.findById(booking.hotel_id);

        res.render("booking-status", {
            booking,
            hotel: hotel || { hotelName: booking.hotelName, photos: [] }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
    }
});


module.exports = router;