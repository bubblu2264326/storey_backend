const express=require('express');
const morgan=require('morgan');
const {Pool}=require('pg');
const dotenv=require('dotenv');
dotenv.config();
const {product_router}=require('./routes/products.routes.js')
const app=express();

//app level middlewares
//logs the incoming request to the server
app.use(morgan('dev'));
//parse input into json format
app.use(express.json())


//global level middleware for error detection
app.use((err,req,res,next)=>{
    console.error('Unhandeled error:',err.stack);
    res.status(500).json({error:'Internal server error'});
})

console.log(typeof(product_router));


//bbinding routers to app
app.use('/products',product_router);



app.listen(8080,(err)=>{
    
    console.log("server is up on localhost:8080");
}).on('error',(err)=>{
    console.error("server failed to start because of :",err);
    process.exit(1)
})
