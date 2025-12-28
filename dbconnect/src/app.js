const express = require("express");
const path = require("path");
const app = express();
require("./db/conn");
const hbs = require("hbs");

const port = process.env.PORT || 7000;
const static_path = path.join(__dirname, "../public");
const templates_path = path.join(__dirname, "../templates/views");
const partials_path = path.join(__dirname, "../templates/partials");


app.use(express.static(static_path));
app.set("view engine", "hbs");
// app.set("views", path.join(__dirname, "../views"));
app.set("view cache", false);
app.set("views", templates_path);
hbs.registerPartials(partials_path);

app.get("/", (req, res) => {
    res.render("index")
});

app.listen(port, () =>{
    console.log(`server is running on port no ${port}`); 
})