const express = require("express");
const router = express.Router();

const create_user = require("../services/create_user");
const { nanoid } = require("nanoid");

router.get("/add-user", (req, res) => {
    res.render("add-user");
});

router.post("/add-user", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userid = nanoid();

        await create_user(name, email, password, userid);

        res.redirect("/");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
    }
});

module.exports = router;