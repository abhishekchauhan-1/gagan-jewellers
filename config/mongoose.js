const mongoose = require('mongoose');

const DB = "mongodb+srv://singhchauhanabhishek816:Agcup8057@cluster0.ue8pgal.mongodb.net/Gagan-Jewellers?retryWrites=true&w=majority"

mongoose.connect(DB).then(()=>{
    console.log("DataBase Connection SuccessFull")
}).catch((err)=>console.log("No Connection Sonething Error"+err));

const db = mongoose.connection;

db.on("error",console.log.bind(console,"Error in Connecting Database"));

db.once("open",function(){
    console.log("SuccesFull Connected To the Database")
})

module.exports = db;