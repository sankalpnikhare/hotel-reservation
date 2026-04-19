const express = require('express');
const mongoose = require('mongoose');
const usermodel = require('../db/model/usermodel.js');

// const bcrypt = require('bcrypt');
// const hashedpassword = require('../utils/encryption');



async function create_user( name , email , password ){
   
    if(!name || !email ||!password ){
        return false ;
    }
    // const hash = await hashedpassword(password);

    const data = await usermodel.create({
        name:name ,
        email:email ,
        password:password
    })

    return true ;


}

module.exports = create_user ; 