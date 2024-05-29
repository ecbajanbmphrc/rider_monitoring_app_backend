const express = require("express");
const app = express();
const mongoose = require("mongoose");
require('dotenv').config()
require('./UserDetails');
require('./AttendanceDetails');
require('./ParcelDetails');
require('./AttendanceInput');
require('./ParcelInput');
require('./ParcelData'); 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

app.use(express.json());

var cors = require('cors');
app.use(cors());


const mongoURI = "mongodb+srv://ecbajanbmphrc:y7eIFXEbU07QQOln@cluster0.5tjfmk7.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=Cluster0";

const User = mongoose.model("users");

const Attendance = mongoose.model("attendances");

const Parcel = mongoose.model("parcels");

const AttendanceInput = mongoose.model("attendanceInput");

const ParcelInput = mongoose.model("parcelInput");

const ParcelData = mongoose.model("parcelData");

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



app.post("/register-user-detail", async(req, res) => {
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
            isActivate: false
        });
        await Attendance.create({
            user: email,
            attendance: []
        });
        await Parcel.create({
            user: email,
            parcel: []
        });
        res.send({status: 200, data:"User Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});

app.post("/login-user" , async(req, res) =>{
    const {email, password} = req.body;
    const oldUser = await User.findOne({ email : email });

    if(!oldUser) return res.send({status: 401, data: "Invalid email or password"});

    if(oldUser.isActivate === false) return res.send({status: 401, data: "User has not been activated yet."});
    
    if(await bcrypt.compare(password, oldUser.password)){
        const token = jwt.sign({email: oldUser.email}, JWT_SECRET);
        
        if(res.status(201)){
            return res.send({ status: 200, data: token, email: oldUser.email, last_name: oldUser.last_name});
        }else{
            return res.send({ error: "error"});
        }

    }{
        return res.send({status: 401, data: "Invalid user or password"});
    }
});

app.put("/update-status", async(req, res) => {
    const {isActivate, email} = req.body;

    const userEmail = email;
    console.log(userEmail);
    try{
        await User.findOneAndUpdate({email: userEmail}, {$set: {isActivate: isActivate}});
        res.send({status: 200, data:"Status updated"})
    } catch(error){
        res.send({status: "errorr", data: error});
    }

});

app.post("/user-data", async(req, res)=> {
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



app.put("/attendance-input-time-in", async(req, res) => {
    const dataSet = {user, w_date, date, time_in, time_in_coordinates, time_out_coordinates, time_out} = req.body;
    
    try {
        const userEmail = user;
        await AttendanceInput.findOneAndUpdate({user: userEmail},{
          
            $addToSet: {
                attendance: {
                    w_date: w_date,
                    date: date,
                    time_in : time_in,
                    time_in_coordinates : time_in_coordinates,
                    time_out: time_out,
                    time_out_coordinates : time_out_coordinates

                }
            }
            
        });
        res.send({status: 200, data:"Attendance Created", dataSet: dataSet})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});

app.get("/retrieve-user-attendance", async(req, res)=> {
  
    const userEmail = req.query.user;
    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});

    try {
       
        
        console.log(userEmail,"user check")
       await Attendance.findOne({user: userEmail, "attendance.date": dateToday}, {
            "attendance.$" : 1
       }).then((data)=>{
            return res.send({ status: 200, data: data.attendance[0] });
        })
    } catch (error) {
            return res.send({error: error});
    }

});

app.put("/attendance-input-time-out", async(req, res) => {

    const {user, time_out, time_out_coordinates} = req.body;
    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});
    console.log(time_out)
    
    try {
        const userEmail = user;
        await Attendance.findOneAndUpdate({user: userEmail, "attendance.date": dateToday},{
            
            $set: { 
                "attendance.$.time_out" : time_out,
                "attendance.$.time_out_coordinates" : 
                    {
                        latitude : time_out_coordinates.latitude,
                        longitude : time_out_coordinates.longitude
                    }
                }

        });
        res.send({status: 200, data:"Attendance Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});


app.put("/parcel-input", async(req, res) => {
    const dataSet = {user, date, parcel_count, parcel_type} = req.body;

    console.log(req.body)

    try {
        const userEmail = user;
        await ParcelInput.findOneAndUpdate({user: userEmail},{
         
        $addToSet: {
            parcel: {
                parcel_count : parcel_count,
                date : date,
                parcel_type : parcel_type
            }
         }
            
        });
        res.send({status: 200, data:"Parcel added", dataSet: dataSet})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});




app.post("/retrieve-parcel-input", async (req, res) => {
    const { user, date } = req.body;

    const selectDate = date;

    try {
        console.log("Searching for parcels for user:", user);

    
        const parcels = await Parcel.aggregate([
            {
                $match: { user: user }
            },
            {
                $project: {
                    user: 1,
                    parcel: {
                        $filter: {
                            input: "$parcel",
                            as: "parcel",
                            cond: { $eq: ["$$parcel.date", selectDate] }
                        }
                    }
                }
            }
        ]);

        console.log("Found parcels:", parcels);

     
        return res.status(200).json({ status: 200, data: parcels });
    } catch (error) {
      
        console.error("Error retrieving parcel data:", error);
        return res.status(500).json({ error: error.message });
    }
});


app.post("/get-all-user", async(req, res)=> {
   

    try {

        User.find().then((data)=>{
            return res.send({ status: 200, data: data });
        })
    } catch (error) {
            return res.send({error: error});
    }

});


app.post("/view-user-attendance", async(req, res)=> {
   
    const { user } = req.body;

    const userEmail = user;

    try {
       
        console.log(userEmail,"user check")
        await Attendance.findOne({user: userEmail})
        .then((data)=>{
            return res.send({ status: 200, data: data.attendance });
        })
    } catch (error) {
            return res.send({error: error});
    }

});

app.post("/test-index", async(req, res)=> {
   
    const { user } = req.body;

    const userEmail = user;

    try {
       
        console.log(userEmail,"user check")
        await Parcel.find().count()
        .then((data)=>{
            return res.send({ status: 200, data: data});
        })
    } catch (error) {
            return res.send({error: error});
    }

});





app.post("/retrieve-parcel-data", async(req, res)=> {

    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});

    try {
    const parcelPerUser = await Parcel.aggregate([
      { '$unwind': "$parcel" },

      {
        '$group': {
         '_id': "$user",
          'count_bulk': {
            '$sum': { '$cond' : [ {'$and' :[{ '$eq': ["$parcel.parcel_type" , "Bulk"]},
                                            { '$eq': ["$parcel.date" , dateToday]}]}, 1, 0] }
          },
          'count_non_bulk': {
            '$sum': { '$cond' : [ {'$and' :[{ '$eq': ["$parcel.parcel_type" , "Non-bulk"]},
                                            { '$eq': ["$parcel.date" , dateToday]}]}, 1, 0] }
          },
        }
      },

      {
        '$project': {
          'user': "$_id",
          'count_bulk' : 1,
          'count_non_bulk' : 1,
          '_id': 0
        }
      },
      {
        '$sort':{
            'user' : 1
        }
      }
    ]);

    console.log("Found parcels:", parcelPerUser);
    return res.status(200).json({ status: 200, data: parcelPerUser });

    } catch (error) {
                return res.send({error: error});
        }
});


app.post("/retrieve-user-parcel-data", async(req, res)=> {

    const { user } = req.body;

    const userEmail = user;

    try {
    const parcelPerUser = await Parcel.aggregate([
      {'$match' : {'user' : userEmail }},
      { '$unwind': "$parcel" },

      {
        '$group': {
         '_id': '$parcel.date',
          'count_bulk': {
            '$sum': { '$cond' : [ {'$and' :[{ '$eq': ["$parcel.parcel_type" , "Bulk"]}]}, 1, 0] }
          },
          'count_non_bulk': {
            '$sum': { '$cond' : [ {'$and' :[{ '$eq': ["$parcel.parcel_type" , "Non-bulk"]}]}, 1, 0] }
          },
        }
      },

      {
        '$project': {
          'date': "$_id",
          'count_bulk' : 1,
          'count_non_bulk' : 1,
          '_id': 0
        }
      },
      { 
        $sort: { "date": -1 } 
      },
    ]);

    console.log("Found parcels:", parcelPerUser);
    return res.status(200).json({ status: 200, data: parcelPerUser });

    } catch (error) {
                return res.send({error: error});
        }
});


const transporter = nodemailer.createTransport({
    pool: true,
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.Email,
      pass: process.env.Pass,
    },
});




// const sendMail = async (transporter, info) => {

//     const data = "send mail"
//     try{
//         transporter.open();
//         await transporter.sendMail(info)
     
//         transporter.open();
//        return console.log('email has been sent');

//     } catch (error){
//         await transporter.close();
//         transporter.open();
//         return console.error(error);
         
//     }
// }



app.post("/send-otp-register", async(req, res)=> {
    const { email} = req.body;

    const oldUser = await User.findOne({email:email});
    
    if (oldUser) return res.send({data:"User already exist!"});

    try {
    //   await sendMail(transporter, info);

        var code = Math.floor(100000 + Math.random() * 900000);   
        code = String(code);
        code = code.substring(0,4);

      const info = await transporter.sendMail({
        from: {
            name: "BMPower",
            address: process.env.Email
        }, // sender address
        to: email, // list of receivers
        subject: "OTP code", // Subject line
        html: "<b>Your OTP code is</b> " + code + "<b>. Do not share this code with others.</b>", // html body

    });
        return res.send({status : 200, data: info, email: email, code: code});
    } catch (error) {
        
            return res.send({error: error});
            // return res.send({data: data});
    }

});


app.post("/send-otp-forgot-password", async(req, res)=> {
    const { email} = req.body;

    const oldUser = await User.findOne({email:email});
    
    if (!oldUser) return res.send({data:"User doesn't exist!"});

    try {
    //   await sendMail(transporter, info);

        var code = Math.floor(100000 + Math.random() * 900000);   
        code = String(code);
        code = code.substring(0,4);

      const info = transporter.sendMail({
        from: {
            name: "BMPower",
            address: process.env.Email
        }, 
        to: email, 
        subject: "OTP code", 
        text: "Hello world?", 
        html: "<b>Your OTP code is</b> " + code + "<b>. Do not share this code with others.</b>", // html body

    });
        return res.send({status : 200, data: info, email: email, code: code});
    } catch (error) {
        
            return res.send({error: error});
            // return res.send({data: data});
    }

});


app.put("/forgot-password-reset", async(req, res) => {
    const {password, email} = req.body;

    const encryptedPassword = await bcrypt.hash(password, 8);

    const userEmail = email;
    console.log(userEmail);
    try{
        await User.findOneAndUpdate({email: userEmail}, {$set: {password: encryptedPassword}});
        res.send({status: 200, data:"Password updated"})
    } catch(error){
        res.send({status: "error", data: error});
    }

});


app.listen(8082, () => {
    
  
    console.log("node js server started");
    console.log(process.env.email) 

});  