const express = require("express");
const router = express.Router();



router.get("/", (req, res) => {
    res.render("homepage");
});



router.get("/homepage", (req, res) => {
    res.render("homepage");
});



router.post("/search", (req, res) => {
    res.render("search");
});


module.exports = router;