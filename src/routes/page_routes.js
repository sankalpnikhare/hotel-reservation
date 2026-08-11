const express = require("express");
const router = express.Router();


// HOME PAGE
router.get("/", (req, res) => {
    res.render("homepage");
});


// HOMEPAGE
router.get("/homepage", (req, res) => {
    res.render("homepage");
});


// SEARCH PAGE
router.post("/search", (req, res) => {
    res.render("search");
});


module.exports = router;