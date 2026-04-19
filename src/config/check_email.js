const express = require('express');
const mongoose = require('mongoose');
const usermodel = require('../db/model/usermodel');



async function check_email(Email){
    const user = await usermodel.findOne({email: Email });
    if(user){
        return user; ;
    }
    return false ; 
}


module.exports = check_email  ;




    