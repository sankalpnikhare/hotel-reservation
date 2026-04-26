
const mongoose = require('mongoose');
const usermodel = require('../db/model/usermodel.js');

const bcrypt = require('bcrypt');
const hash_password = require('./hash_password.js');

// const hashedpassword = require('../utils/encryption');



async function create_user( name , email , password, userid ){
   
    if(!name || !email ||!password ||!userid ){
        return false ;
    }
    const hash = await hash_password(password);

    const data = await usermodel.create({
        name:name ,
        email:email ,
        password:hash,
        userid:userid

    })

    return true ;


}

module.exports = create_user ; 