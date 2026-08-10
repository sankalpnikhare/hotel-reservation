const express =  require('express');
const router = express.Router();

router.get('/sample' , (req,res)=>{
    res.send("Hey")
})


module.exports = router;