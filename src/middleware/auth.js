const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');

const authtoken = (req,res,next) =>{
    try{
        const token = req.session.token ; 
        if(!token){
            return res.send("Please Login first");
        }
        const decoded = jwt.verify(token , process.env.JWT_SECRET_KEY);
        req.user= decoded ;
        next();
    }catch(err){
        return res.send("Error")
    }
};

module.exports = authtoken ; 