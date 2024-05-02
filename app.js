const express = require("express");
const app = express();
const mongoose = require("mongoose");
require('./UserDetails');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());


const mongoURI = "mongodb+srv://ecbajanbmphrc:y7eIFXEbU07QQOln@cluster0.5tjfmk7.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=Cluster0";
const User = mongoose.model("users");

const JWT_SECRET = "asdfghjklzxcvbnmqwertyuiop";


mongoose
 .connect(mongoURI)
 .then(()=>{
    console.log("Database Connected successfully");
 })
 .catch((e) => {
    console.log(e);
});

app.get("/", (req, res) => {
    res.send({status:"started"})

});

app.post("/register", async(req, res) => {
    const {first_name, middle_name, last_name, email, phone, address, password} = req.body;

    const encryptedPassword = await bcrypt.hash(password, 8);

    const oldUser = await User.findOne({email:email});
    
    if (oldUser) return res.send({data:"User already exist!"});

    try {
        await User.create({
            first_name,
            middle_name,
            last_name,
            email,
            phone,
            address,
            password: encryptedPassword,
        });
        res.send({status: 200, data:"User Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});

app.post("/login-user" , async(req, res) =>{
    const {email, password} = req.body;
    const oldUser = await User.findOne({ email : email });

    if(!oldUser) return res.send({status: 401, data: "Invalid user or password"});
    
    if(await bcrypt.compare(password, oldUser.password)){
        const token = jwt.sign({email: oldUser.email}, JWT_SECRET);
        
        if(res.status(201)){
            return res.send({ status: 200, data: token});
        }else{
            return res.send({ error: "error"});
        }

    }{
        return res.send({status: 401, data: "Invalid user or password"});
    }
});

app.post("/userdata", async(req, res)=> {
    const {token} = req.body;

    try {
        const user = jwt.verify(token, JWT_SECRET)
        const userEmail = user.email;

        User.findOne({email: userEmail}).then((data)=>{
            return res.send({ status: 200, data: data });
        })
    } catch (error) {
            return res.send({error: error});
    }

});


app.listen(8082, () => {
    console.log("node js server started");

});