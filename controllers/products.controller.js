const {pool} =require('../models/database.js')
const dotenv=require('dotenv')
dotenv.config();
async function getAll(req,res){
    try{
     const result=await pool.query("select * from products where products.store_id=1"  )
     //console.log(result.rows);
     res.json(result.rows)
    }catch(err){
        console.error("query failed :",err)
        res.status(500).json({error:err})
    }
     
}




module.exports={
    getAll
}


