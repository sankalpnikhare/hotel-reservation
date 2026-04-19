const bcrypt = require('bcrypt');


async function hash_password(password){
    const hash = await bcrypt.hash(password ,  10 );
    return hash ; 
}

module.exports = hash_password ;  