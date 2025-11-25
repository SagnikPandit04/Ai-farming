import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import path from "path"
const app = express();
dotenv.config();

const PORT = process.env.PORT || 7000;
const static_path = path.join(__dirname, "../public");

app.use(express.static(static_path));

const MONGOURL = process.env.MONGO_URL;

mongoose.connect(MONGOURL).then(()=>{
    console.log("Database base is connected");
    app.listen(PORT, ()=>{
        console.log(`server is running on port ${PORT}`);
    });
}) .catch((error)=> console.log(error));

const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
});

const userModel = mongoose.model("users", userSchema)

app.get("/getUsers", async(req, res) =>{
    const userData = await userModel.find();
    res.json(userData);
});

