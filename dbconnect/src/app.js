const express = require("express");
const path = require("path");
const app = express();
require("./db/conn");

const port = process.env.PORT || 7000;
const static_path = path.join(__dirname, "./public");

app.use(express.static(static_path));

app.get("/", (req, res) => {
    res.send("Hello from Sagnik here");
});

app.listen(port, () =>{
    console.log(`server is running on port no ${port}`);
})