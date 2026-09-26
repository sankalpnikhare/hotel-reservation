

const bcrypt =  require('bcrypt'); 



async function check_password(password , userpassword){
    
    const check =await bcrypt.compare(password , userpassword  );
    
    
    return check ; 
}
module.exports = check_password ; 