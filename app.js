const express = require("express");
const app = express();
const mongoose = require("mongoose");
require('./UserDetails');
require('./AttendanceDetails');
require('./ParcelDetails');
require('./AttendanceInput');
require('./ParcelInput');
require('./ParcelData');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());


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

// app.post("/retrieve-parcel-input", async(req, res)=> {
  
//     const {user} = req.body;
//     const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});

//     try {
//         console.log("test parcel", user)
//        await Parcel.find({ "parcel.date" : "5/13/2024"}
//     //    ,
//     //     {
//     //         "parcel.$" : 1
//     //     }
//        ).then((data)=>{
//             return res.send({ status: 200, data: data[0].parcel});
//         })
//     } catch (error) {
//             return res.send({error: error});
//     }

// });


// app.post("/retrieve-parcel-input", async(req, res)=> {
  
//     const {user} = req.body;
//     const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});

//     try {
//         console.log("test parcel", user)
//     await ParcelData.find({user: "juan18@gmail.com" , "parcel.parcel_type" : "Bulk"}
        
//         ).then((data)=>{
//                 return res.send({ status: 200, data: data});
//             })

//     } catch (error) {
//             return res.send({error: error});
//     }

// });


app.post("/retrieve-parcel-input", async (req, res) => {
    const { user } = req.body;

    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric'});

    try {
        console.log("Searching for parcels for user:", user);

        // Aggregate to filter parcels for the specified user with parcel_type "Bulk"
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
                            cond: { $eq: ["$$parcel.date", dateToday] }
                        }
                    }
                }
            }
        ]);

        console.log("Found parcels:", parcels);

        // Send the found parcels as a response
        return res.status(200).json({ status: 200, data: parcels });
    } catch (error) {
        // If an error occurs, send an error response
        console.error("Error retrieving parcel data:", error);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(8082, () => {
  
    console.log("node js server started");

});