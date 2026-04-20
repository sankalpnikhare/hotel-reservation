const mongoose = require('mongoose'); 

const bcrypt =  require('bcrypt'); 
const usermodel = require('../db/model/usermodel');


async function check_password(password , userpassword){
    
    const check = bcrypt.compare(password , userpassword  );
    if(check){
        return true 
    }
    return false ;
}
module.exports = check_password ; 