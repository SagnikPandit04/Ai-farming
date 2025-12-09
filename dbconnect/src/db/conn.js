const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/dbconnect", {
    // useNewUrlParser,
    // useUnifiedTopology,
    // useCreateIndex
}).then(() =>{
    console.log(`connection successful`);
}).catch((err)=>{
    console.log(`no connection`);
})