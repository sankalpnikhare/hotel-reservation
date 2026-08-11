const express = require("express");
const router = express.Router();

const hotelModel = require("../db/model/hotelmodel");
const bookingmodel = require("../db/model/bookingmodel");

const authtoken = require("../middleware/auth");


// =========================
// PROFILE
// =========================

router.get(
    "/profile",

    authtoken,

    async (req, res) => {

        try {

            const ownerid =
                req.session.user.userid;


            // =========================
            // USER'S PROPERTIES
            // =========================

            const listedProperties =
                await hotelModel.find({
                    ownerid: ownerid
                });


            // =========================
            // USER'S BOOKINGS
            // =========================

            const rawBookings =
                await bookingmodel.find({
                    userEmail:
                        req.session.user.email
                });


            const bookedProperties =
                await Promise.all(

                    rawBookings.map(
                        async (booking) => {

                            const bookingObj =
                                booking.toObject();


                            try {

                                const hotel =
                                    await hotelModel.findById(
                                        booking.hotel_id
                                    );


                                if (hotel) {

                                    bookingObj.hotelPhotos =
                                        hotel.photos || [];

                                    bookingObj.hotelLocation =
                                        hotel.location ||
                                        booking.location ||
                                        "";

                                    bookingObj.hotelPrice =
                                        hotel.price ||
                                        null;

                                }

                            } catch (e) {

                                bookingObj.hotelPhotos =
                                    [];

                                bookingObj.hotelLocation =
                                    booking.location ||
                                    "";

                            }


                            return bookingObj;

                        }
                    )

                );


            // =========================
            // HOST DASHBOARD
            // =========================

            let dashboardStats = null;

            let hostBookings = [];


            if (
                listedProperties &&
                listedProperties.length > 0
            ) {

                const hotelIds =
                    listedProperties.map(
                        hotel =>
                            hotel._id.toString()
                    );


                const rawHostBookings =
                    await bookingmodel.find({
                        hotel_id: {
                            $in: hotelIds
                        }
                    });


                let totalRevenue = 0;

                let totalRoomsBooked = 0;


                hostBookings =
                    await Promise.all(

                        rawHostBookings.map(
                            async (booking) => {

                                const bookingObj =
                                    booking.toObject();


                                const hotel =
                                    listedProperties.find(
                                        h =>
                                            h._id.toString() ===
                                            booking.hotel_id
                                    );


                                if (hotel) {

                                    bookingObj.hotelName =
                                        hotel.hotelName;

                                    bookingObj.hotelPrice =
                                        hotel.price;

                                    bookingObj.hotelPhotos =
                                        hotel.photos || [];


                                    const nights =
                                        Math.max(
                                            1,
                                            Math.round(
                                                (
                                                    new Date(
                                                        booking.checkout
                                                    ) -
                                                    new Date(
                                                        booking.checkin
                                                    )
                                                ) /
                                                (
                                                    1000 *
                                                    60 *
                                                    60 *
                                                    24
                                                )
                                            )
                                        );


                                    const revenue =
                                        (
                                            hotel.price || 0
                                        ) *
                                        (
                                            booking.rooms || 1
                                        ) *
                                        nights;


                                    bookingObj.revenue =
                                        revenue;

                                    bookingObj.nights =
                                        nights;


                                    totalRevenue +=
                                        revenue;

                                } else {

                                    bookingObj.revenue =
                                        0;

                                    bookingObj.nights =
                                        1;

                                }


                                totalRoomsBooked +=
                                    booking.rooms || 0;


                                return bookingObj;

                            }
                        )

                    );


                dashboardStats = {

                    totalProperties:
                        listedProperties.length,

                    totalBookings:
                        rawHostBookings.length,

                    totalRevenue,

                    totalRoomsBooked

                };

            }


            // =========================
            // RENDER PROFILE
            // =========================

            res.render(
                "profile",
                {

                    user:
                        req.session.user,

                    listedProperties,

                    bookedProperties,

                    dashboardStats,

                    hostBookings

                }
            );


        } catch (err) {

            console.error(err);

            res.status(500).send(
                "Error loading profile"
            );

        }

    }
);


module.exports = router;