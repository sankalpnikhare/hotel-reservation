const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

const hotelModel = require("../db/model/hotelmodel");

const check_email = require("../config/check_email");

const authtoken = require("../middleware/auth");
const { log } = require("console");
const { STATUS_CODES } = require("http");




const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            "public/uploads/"
        );

    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + "-" + file.originalname
        );

    }

});

const upload = multer({
    storage: storage
});


router.get(
    "/add-property",
    authtoken,
    (req, res) => {

        res.render("hotel");

    }
);




router.get(
    "/hotels",
    async (req, res) => {

        const location = req.query.location;

        const minPrice =
            req.query.minPrice !== undefined &&
            req.query.minPrice !== ""
                ? Number(req.query.minPrice)
                : null;

        const maxPrice =
            req.query.maxPrice !== undefined &&
            req.query.maxPrice !== ""
                ? Number(req.query.maxPrice)
                : null;


        // Save search information in session

        req.session.rooms = req.query.rooms;
        req.session.adults = req.query.adults;
        req.session.checkin = req.query.checkin;
        req.session.checkout = req.query.checkout;


        try {

            const query = {

                location: {
                    $regex: location,
                    $options: "i"
                }

            };


            const priceFilter = {};


            if (
                minPrice != null &&
                !isNaN(minPrice)
            ) {

                priceFilter.$gte = minPrice;

            }


            if (
                maxPrice != null &&
                !isNaN(maxPrice)
            ) {

                priceFilter.$lte = maxPrice;

            }


            if (
                Object.keys(priceFilter).length
            ) {

                query.price = priceFilter;

            }


            const hotels =
                await hotelModel.find(query);


            res.render(
                "hotels",
                {
                    hotels,
                    location,
                    minPrice:
                        req.query.minPrice || "",
                    maxPrice:
                        req.query.maxPrice || ""
                }
            );


        } catch (err) {

            console.error(err);

            return res.send(
                "There was an error"
            );

        }

    }
);



router.post(
    "/add-property",

    upload.array(
        "hotelPhotos",
        4
    ),

    async (req, res) => {

        try {

            const {
                hotelName,
                location,
                address,
                totalRooms,
                price
            } = req.body;


            const imagePaths =
                req.files.map(
                    file =>
                        `/uploads/${file.filename}`
                );


            // Use the logged-in user
            const ownername =
                req.session.user.name;

            const owneremail =
                req.session.user.email;

            const user =
                await check_email(owneremail);

            const ownerid =
                user.userid;


            const newHotel =
                new hotelModel({

                    ownername,

                    ownerid,

                    hotelName,

                    location,

                    address,

                    price,

                    totalRooms,

                    photos: imagePaths

                });


            const savedhotel = await newHotel.save();
            try{
                if(savedhotel){
                    res.redirect(`hotel/${savedhotel._id}`)
                } 
                }catch (err){
                    res.send('SOmething wrong occured')
            }

            

            // res.render(`/hotel/${savedhotel._id}`)
            // res.render('homepage');
            // console.log(savedhotel._id);
            
            // res.send(
            //     "Property added successfully"
            // );


        } catch (err) {

            console.error(err);

            res.status(500).send(
                "Error"
            );

        }

    }
);



router.get(
    "/hotel/:id",

    async (req, res) => {

        try {

            const hotel =
                await hotelModel.findOne({
                    _id: req.params.id
                });


            req.session.hotelid =
                req.params.id;


            if (!hotel) {

                return res
                    .status(404)
                    .send("Hotel not found");

            }


            const session =
                req.session;


            res.render(
                "hotel-details",
                {
                    hotel,
                    session
                }
            );


        } catch (err) {

            console.error(err);

            res.status(500).send(
                "Error fetching hotel details"
            );

        }

    }
);



router.delete(
    "/delete-property/:id",

    authtoken,

    async (req, res) => {

        try {

            const hotelId =
                req.params.id;


            // IMPORTANT:
            // Your session stores userid inside user
            const ownerid =
                req.session.user.userid;


            const hotel =
                await hotelModel.findById(
                    hotelId
                );


            if (!hotel) {

                return res
                    .status(404)
                    .send(
                        "Property not found"
                    );

            }


            if (hotel.ownerid !== ownerid) {

                return res
                    .status(403)
                    .send(
                        "Unauthorized"
                    );

            }


            await hotelModel.findByIdAndDelete(
                hotelId
            );


            res.status(200).send(
                "Property deleted successfully"
            );


        } catch (err) {

            console.error(err);

            res.status(500).send(
                "Error deleting property"
            );

        }

    }
);


module.exports = router;