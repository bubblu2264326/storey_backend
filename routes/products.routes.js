const express=require('express');
const product_router=express.Router();
const products_controllers=require('../controllers/products.controller.js');


product_router.get('/',products_controllers.getAll);



module.exports={
    product_router
}

