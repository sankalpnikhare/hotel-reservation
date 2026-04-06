const dotenv = require('dotenv');
dotenv.config(); 
const express = require('express');


const app = express() ; 

app.set('view engine' , 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.get('/' ,(req,res)=>{
    res.send("Hello!")

})

console.log(process.env.PORT);



app.listen( 5000 , ()=>{
    console.log(`Server listening at port `);
    
})