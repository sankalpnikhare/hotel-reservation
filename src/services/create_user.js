
const mongoose = require('mongoose');
const usermodel = require('../db/model/usermodel.js');

const bcrypt = require('bcrypt');
const hash_password = require('./hash_password.js');

// const hashedpassword = require('../utils/encryption');



async function create_user(name, email, password, userid) {

    if (!name || !email || !userid) {
        return false;
    }

    const userData = {
        name,
        email,
        userid
    };

    if (password) {
        userData.password = await hash_password(password);
    }

    await usermodel.create(userData);

    return true;


}

module.exports = create_user ; 