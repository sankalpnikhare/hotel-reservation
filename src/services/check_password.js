const mongoose = require('mongoose'); 

const bcrypt =  require('bcrypt'); 
const usermodel = require('../db/model/usermodel');


async function check_password(password , userpassword){
    
    const check =await bcrypt.compare(password , userpassword  );
    return check ; 
}
module.exports = check_password ; 