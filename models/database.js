const {Pool}=require('pg')


const pool=new Pool({
    connectionString:process.env.db_url,
    ssl:{
        rejectUnauthorized:false
    }
});

pool.query('select 1')
.then(()=>{
    console.log("Database is Connected");
})
.catch((err)=>{
    console.error("Database Connection failed ",err);
})
module.exports={
    pool
}