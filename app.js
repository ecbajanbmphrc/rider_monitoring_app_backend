
const BUCKET = process.env.BUCKET;

// AWS.config.update({region:'us-east-1'});


const {memoryStorage} =  require("multer");
const multer = require("multer");
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
require('./AssignedParcel')
require('./Hub');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
var moment = require('moment-timezone');
app.use(express.json());

var cors = require('cors');
const { pipeline } = require("nodemailer/lib/xoauth2");
const { s3UploadReceipt, s3UploadScreenshot } = require('./s3');
// const { uploadToS3 } = require("./s3");
const storage = multer.memoryStorage();
const upload = multer({storage});
app.use(cors());


const mongoURI = "mongodb+srv://ecbajanbmphrc:EvqZlwFpXxeA6T6i@rmaproductionserverless.phmnjem.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=rmaProductionServerless";
// const mongoURI = "mongodb+srv://ecbajanbmphrc:y7eIFXEbU07QQOln@cluster0.5tjfmk7.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=Cluster0";

const User = mongoose.model("users");

const Attendance = mongoose.model("attendances");

const Parcel = mongoose.model("parcels");

const AttendanceInput = mongoose.model("attendanceInput");

const ParcelInput = mongoose.model("parcelInput");

const ParcelData = mongoose.model("parcelData");

const AssignedParcel = mongoose.model("assignedParcel");

const Hub = mongoose.model("hubs")

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

    const dateNow =  new Date();
    
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
            isActivate: false,
            j_date : dateNow,
            type : 1
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

            return res.send({ status: 200, data: token, email: oldUser.email, first_name: oldUser.first_name, middle_name: oldUser.middle_name, last_name: oldUser.last_name, phone: oldUser.phone, id : oldUser._id.toString()});
        }else{
            return res.send({ error: "error"});
        }

    }{
        return res.send({status: 401, data: "Invalid user or password"});
    }
});


app.post("/login-admin" , async(req, res) =>{
    const {email, password} = req.body;
    const oldUser = await User.findOne({ email : email });

    if(!oldUser) return res.send({status: 401, data: "Invalid email or password"});

    if(!oldUser.type === 2) return res.send({status: 401, data: "Invalid User ."});

    if(oldUser.isActivate === false) return res.send({status: 401, data: "User is already deactivated yet."});
    
    if(await bcrypt.compare(password, oldUser.password)){
        const token = jwt.sign({email: oldUser.email}, JWT_SECRET);
        
        if(res.status(201)){
            return res.send({ status: 200, data: token, email: oldUser.email, first_name: oldUser.first_name, middle_name: oldUser.middle_name, last_name: oldUser.last_name, phone: oldUser.phone});
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

app.put("/update-user-hub", async(req, res) => {
    const {hub_id, email} = req.body;

    const userEmail = email;
    console.log(userEmail);
    try{
        await User.findOneAndUpdate({email: userEmail}, {$set: {hub_id: hub_id}});
        res.send({status: 200, data:"Hub updated"})
    } catch(error){
        res.send({status: "errorr", data: error});
    }

});


app.put("/update-hub-status", async(req, res) => {
    const {isActivate, id} = req.body;
   
    try{
        await Hub.findByIdAndUpdate( id, {isActive: isActivate});
    
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

app.post("/get-rider-user", async(req, res)=> {
   

    try {

        const data = await User.aggregate([
            
            {
                $match: {
                        type : 1                   
                }
            },
            {
              $lookup :
                        {
                         from : "hubs",
                         let : {
                            hubId : "$hub_id"
                         },
                         pipeline: [
                            {  
                                $match: {
                                    $expr: {
                                        $eq: [
                                            {"$toString" : "$_id"},
                                            "$$hubId"
                                        ]
                                    }
                                  }  
                            }
                        ],
                         as: "hub_details"
                        }
            },
            {
                $project: {
                    "first_name" : 1,
                    "middle_name" : 1,
                    "last_name" : 1,
                    "email" : 1,
                    "phone" : 1,
                    "address" : 1,
                    "isActivate" : 1,
                    "hub_id" : 1,
                    "j_date" : 1,
                    "hub_name" : "$hub_details.hub_name"
                }
            }
              
          
        ])
            
        return res.send({ status: 200, data: data});
    
    } catch (error) {
            return res.send({error: error});
    }

});


app.post("/get-admin-user", async(req, res)=> {
   

    try {

        const data = await User.aggregate([
            
            {
                $match: {
                        type : 2                
                }
            },
            {
                $project: {
                    "first_name" : 1,
                    "middle_name" : 1,
                    "last_name" : 1,
                    "email" : 1,
                    "phone" : 1,
                    "address" : 1,
                    "isActivate" : 1,
                    "j_date" : 1,
                }
            }
              
          
        ])
            
        return res.send({ status: 200, data: data});
    
    } catch (error) {
            return res.send({error: error});
    }

});


app.put("/attendance-input-time-in", async(req, res) => {
    const dataSet = {user, time_in_coordinates, time_out_coordinates, time_out} = req.body;
    
    const dateNow =  new Date();
    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone:'Asia/Manila'});
    const timeNow = new Date().toLocaleString('en-us',{hour:'numeric', minute:'numeric', second:'numeric', timeZone:'Asia/Manila'});

    try {
        const userEmail = user;
        await AttendanceInput.findOneAndUpdate({user: userEmail},{
          
            $addToSet: {
                attendance: {
                    w_date: dateNow,
                    date: dateToday,
                    time_in : timeNow,
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
    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone:'Asia/Manila'});

    try {
       
       console.log(userEmail,"user check")
       const userAttendance = await Attendance.findOne({user: userEmail, "attendance.date": dateToday}, {
            "attendance.$" : 1      
        })

        if(!userAttendance) return res.send({status: 400, data :  "no data"});
        return res.send({ status: 200, data: userAttendance.attendance[0] });
    } catch (error) {
            return res.send({error: error});
    }

});

app.put("/attendance-input-time-out", async(req, res) => {

    const {user, time_out_coordinates, assignedParcel} = req.body;
    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});
    const dateNow =  new Date();
    const timeNow = new Date().toLocaleString('en-us',{hour:'numeric', minute:'numeric', second:'numeric', timeZone:'Asia/Manila'});

    try {
        const userEmail = user;
        await Attendance.findOneAndUpdate({user: userEmail, "attendance.date": dateToday},{
            
            $set: { 
                "attendance.$.time_out" : timeNow,
                "attendance.$.time_out_coordinates" : 
                    {
                        latitude : time_out_coordinates.latitude,
                        longitude : time_out_coordinates.longitude
                    }
                }

        });

        await AssignedParcel.create({
            user: userEmail,
            date: dateToday,
            w_date: dateNow,
            assigned_parcel_count: assignedParcel
        })
        res.send({status: 200, data:"Attendance Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});


// app.post("/parcel-input", upload.single("file"), async(req, res) => {
//     const user = req.body.user;
//     const email = req.body.email;
//     const parcel_non_bulk_count = req.body.parcel_non_bulk_count;
//     const parcel_bulk_count = req.body.parcel_bulk_count;
//     const assigned_parcel_count = req.body.assigned_parcel_count;
//     const dateNow =  Date.parse(new Date());
//     const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});
//     let receiptArr = [];
//     var x = 1;

//     const bucketName = 'rmaimage';
  
//    try{
//     if (Array.isArray(req.body.myFile)){
//     req.body.myFile.forEach(async function (item, index) {
//         const bufferImg = Buffer.from(item,  'base64');
//         let mor = '';

//         const params = {
//             Bucket: bucketName,
//             Key:  "receipt/"+"id?/" +user+ "/" + "r"+dateNow + index+".jpg",
//             Body: bufferImg
//         }

        

//         const imgData = s3.upload(params, (err, data) => {
//             let y = "wa";
//             if (err){
//                 console.log(err)
//                 return
//             }
//             if(data){
//                 // console.log(data)
//                 mor = y
//                 return data.Location
//             }
           
//         });
      
//         receiptArr.push("https://rmaimage.s3.ap-southeast-2.amazonaws.com/receipt/"+"id%3F/" +user+ "/" + "r"+dateNow + index+".jpg")
        
//         // receiptArr.push(imgData);

  

//     }) 

//     }else{


//         const buf = Buffer.from(req.body.myFile, 'base64');
//         const params = {
//             Bucket: bucketName,
//             Key: "receipt/"+"id?/" +user+ "/" + "r"+dateNow +"0.jpg",
//             Body: buf
//         }

//         s3.upload(params, (err, data) => {
//             if (err){
//                 console.log(err)
//             }
    
//             if(data){
//                 receiptArr.push(data.Location);
//             }
//         })  
//      }
    


//         await ParcelInput.findOneAndUpdate({user: email},{
//         $addToSet: {
//             parcel: {
//                 parcel_non_bulk_count : parcel_non_bulk_count,
//                 parcel_bulk_count: parcel_bulk_count,
//                 assigned_parcel_count: assigned_parcel_count,
//                 receipt : receiptArr,
//                 date : dateToday,
//                 w_date : dateNow
//             }
//          }
            
//         });
//         res.send({status: 200, data:"Parcel added", dataSet: dataSet})
//     }  catch (error) {
//             res.send({ status: "error", data: error});
//     }


    // s3.upload(params, (err, data) => {
    //     if (err){
    //         console.log(err)
    //     }

    //     if(data){
    //         console.log("success")
    //     }
    // })

    
    


    // const uploadToS3 = async ({file}) => {
    //     const key = "id1";
    //     const command = new PutObjectCommand({
    //      Bucket: BUCKET,
    //      Key: key,
    //      Body: file,
    //      ContentType: "jpeg",
    //     });
     
    //     try {
    //      await s3.send(command);
    //      return { key };
    //     }catch (error){
    //      console.log(error);
    //      return {error};
    //     }
    //  };

    //  const {error, key} = uploadToS3(buf);


    // try {
    //     const userEmail = user;
    //     await ParcelInput.findOneAndUpdate({user: userEmail},{
         
    //     $addToSet: {
    //         parcel: {
    //             parcel_non_bulk_count,
    //             parcel_bulk_count,
    //             assigned_parcel_count,
    //             receipt,
    //             date : dateToday,
    //             w_date : dateNow
    //         }
    //      }
            
    //     });
    //     res.send({status: 200, data:"Parcel added", dataSet: dataSet})
    // } catch (error) {
    //     res.send({ status: "error", data: error});
    // }
// });
app.post("/parcel-input", upload.array("file"), async(req, res) => {
    
  try{

        const weekNow = moment.tz("Asia/Manila").week(); 
        var weekDayName =  moment().tz("Asia/Manila").format('dddd');
        const dateNow =  Date.parse(new Date());
        const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});
        const file = req.body;
        const receiptResult = await s3UploadReceipt(file);
        const screenshotResult = await s3UploadScreenshot(file);
        if(receiptResult.statusCode === 200 && screenshotResult.statusCode === 200) {

            await ParcelInput.findOneAndUpdate({user: file.email},{
         
                    $addToSet: {
                        parcel: {
                            parcel_non_bulk_count: parseInt(file.parcel_non_bulk_count),
                            parcel_bulk_count: parseInt(file.parcel_bulk_count),
                            assigned_parcel_count: parseInt(file.assigned_parcel_count),
                            total_parcel: parseInt(file.total_parcel),
                            remaining_parcel: parseInt(file.remaining_parcel),
                            screenshot: screenshotResult.url,
                            receipt: receiptResult.url,
                            date : dateToday,
                            weekday : weekDayName,
                            weekNumber : weekNow,
                            w_date : dateNow
                        }
                     }
                        
                    });

           res.send({ status: 200, data: "success eyy", receiptResult});
        }
      
    }catch(error){
        console.log(error)
        res.send({ status: "error", data: error})
    }
});



app.post("/retrieve-parcel-input", async (req, res) => {
    const { user } = req.body;

  

    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});
    const weekNow = moment.tz("Asia/Manila").week(); 
    const weekDayName =  moment().tz("Asia/Manila").format('dddd');

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
                            cond: { $eq: ["$$parcel.weekNumber", weekNow] }
                        }
                    }
                }
            },
            {
                $sort:{
                    w_date: 1
                }
            }
        ]);

        console.log("Found parcels:", parcels);

     
        return res.status(200).json({ status: 200, data: parcels, weekday: weekDayName });
    } catch (error) {
      
        console.error("Error retrieving parcel data:", error);
        return res.status(500).json({ error: error.message });
    }
});


app.post("/fetch-hub", async (req, res) => {
  

    try {
           const hubData =  await Hub.find()
        return res.send({ status: 200, data: hubData });
    } catch (error) {
      
        console.error("Error retrieving hub data:", error);
        return res.status(500).json({ error: error.message });
    }
});


app.post("/create-hub", async(req, res) => {
    const {hub_name, address, region, coordinates} = req.body;

    const dateNow =  new Date();

    const oldHub = await Hub.findOne({hub_name: hub_name});
    
    if (oldHub) return res.send({data:"Hub already exist!"});

    try {
        await Hub.create({
            w_date : dateNow,
            hub_name,
            region,
            address,
            isActive: true,
            coordinates,
        });
      
        res.send({status: 200, data:"Hub Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
}); 


app.post("/edit-hub", async(req, res) => {
    const {id, hub_name, address, region, coordinates} = req.body;

    try {
        await Hub.findByIdAndUpdate(id,
            {
            hub_name,
            region,
            address,
            coordinates,
        });
      
        res.send({status: 200, data:"Hub Updated"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
}); 



app.post("/retrieve-user-attendance-today", async(req, res)=> {

    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});
    try {
        console.log(dateToday)
        const attendanceToday = await Attendance.aggregate([
        {'$unwind' : "$attendance"},
      
        {
         '$group' : {
            '_id' : "$user",
            'date' : {'$last': "$attendance.date"} ,
            'timeIn' : {'$last': "$attendance.time_in"} ,
            'timeInCoordinates' : {'$last': "$attendance.time_in_coordinates"}, 
            'timeOut' : {'$last': "$attendance.time_out"},
            'timeOutCoordinates' : {'$last': "$attendance.time_out_coordinates"}, 
         
         }  
        },
        {
          '$lookup' : {
              from: "users",
              localField: "_id",
              foreignField: "email",
              as: "user_details"
          }
        },
        {
            $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$user_details", 0]}, "$$ROOT" ]}}
        },

        {
            $match:{
                "isActivate" : true
            }
        },
        {
         '$project': {
            'user' : '$_id',
            'dateSeparate' : '$date',
            'timeIn' : { '$cond' : [ { '$eq' : ['$date' , dateToday]}, "$timeIn", "no record"]},
            'timeInCoordinates' : { '$cond' : [ { '$eq' : ['$date' , dateToday]}, "$timeInCoordinates", "no record"]}, 
            'timeOut' : { '$cond' : [ { '$eq' : ['$date' , dateToday]}, "$timeOut", "no record"]},
            'timeOutCoordinates' : { '$cond' : [ { '$eq' : ['$date' , dateToday]}, "$timeOutCoordinates", "no record"]},
            'email' : '$user',
            'first_name' : "$first_name",
            'middle_name' : "$middle_name",
            'last_name' : "$last_name",
            
            
         } 
        },
          {
         '$sort' : {"first_name": 1,
                    "last_name": 1
         }
        },

        ])
       
            return res.send({ status: 200, data: attendanceToday });
       
    } catch (error) {
            return res.send({error: error});
    }


});


app.post("/export-attendance-data", async(req, res)=> {

    const { start, end } = req.body;

    console.log(start , end)



    try {
       
        const data = await Attendance.aggregate([
            {
             $unwind: "$attendance"
            },{
                $match: {
                    $expr: {
                        $and: [
                            {$gte : [{$toLong: "$attendance.w_date"} ,  start]},
                            {$lt : [{$toLong: "$attendance.w_date"} , end]}
                        ]
                    }
                }
            },
            {
                $lookup : {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "user_details"
                }
            },
            {
                $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$user_details", 0]}, "$$ROOT" ]}}
            },
            {
                $project: {
                   'user' : '$email',
                   'date' : '$attendance.date',
                   'timeIn' : '$attendance.time_in',
                   'timeOut' : '$attendance.time_out',
                   'email' : '$user',
                   'first_name' : "$first_name",
                   'middle_name' : "$middle_name",
                   'last_name' : "$last_name",
                   
                   
                } 
            }    
        
        ])
         
        return res.send({ status: 200, data: data});
        
    } catch (error) {
            return res.send({error: error});
    }


});


app.post("/export-parcel-data", async(req, res)=> {

    const { start, end } = req.body;


    try {
       
        const data = await Parcel.aggregate([
            {
             $unwind: "$parcel"
            },{
                $match: {
                    $expr: {
                        $and: [
                            {$gte : [{$toLong: "$parcel.w_date"} ,  start]},
                            {$lt : [{$toLong: "$parcel.w_date"} , end]}
                        ]
                    }
                }
            },
            {
                $group: {
                    '_id' : '$parcel.date',
                    'user' : {$first : '$user'},
                    // 's_date' : {$first :'$parcel.date'},
                    'count_bulk' : {
                        $sum : { $cond :[ {$eq : ["$parcel.parcel_type", "Bulk"]}, 1 , 0]}
                    },
                    'count_non_bulk' : {
                        $sum : { $cond :[ {$eq : ["$parcel.parcel_type", "Non-bulk"]}, 1 , 0]}
                    }

                }
            },
            {
                $lookup:
                 {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "user_details"
                 }
            },
            {
                $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$user_details", 0]}, "$$ROOT" ]}}
            },
            {

                $project: {
                    'count_non_bulk' : 1,
                    'count_bulk' : 1,
                    'first_name' : "$first_name",
                    'middle_name' : "$middle_name",
                    'last_name' : "$last_name",
                    'email' : "$email"
                }

            },
            {
                $sort: {
                    'first_name' : 1,
                    'last_name' : 1,
                    '_id' : -1
                }
            }
           
        
        ])
         
        return res.send({ status: 200, data: data});
        
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

// app.post("/test-index", async(req, res)=> {
   
//     const { user } = req.body;

//     const userEmail = user;

//     try {
       
//         const data = await Attendance.aggregate([
//             {
           
//             // $group :
//             // {
//             //     _id:"$user",
//             //     date: { $addToSet : {$eq: ["$attendance.date" , "5/13/2024"]}}
//             // },
//             // $match : {
//             //     "$date" : {$eq : "5/13/2024"}
//             // },
//             $project: {
//               attendance: {
//                 $filter:{
//                     input:"$attendance",
//                     as: "date",
//                     cond: { $eq: [ "$$date.date", "5/13/2024"]}
//                 }
//               },
//               user: "$user"
//             }
//             }
//         ])
         
//         return res.send({ status: 200, data: data});
        
//     } catch (error) {
//             return res.send({error: error});
//     }

// });

app.post("/test-index", async(req, res)=> {
   
    const { start, end } = req.body;


    try {
       
        const data = await Parcel.aggregate([
            {
             $unwind: "$parcel"
            },{
                $match: {
                    $expr: {
                        $and: [
                            {$gte : [{$toLong: "$parcel.w_date"} ,  start]},
                            {$lt : [{$toLong: "$parcel.w_date"} , end]}
                        ]
                    }
                }
            },
            {
                $group: {
                    '_id' : '$parcel.date',
                    'user' : {$first : '$user'},
                    // 's_date' : {$first :'$parcel.date'},
                    'count_bulk' : {
                        $sum : { $cond :[ {$eq : ["$parcel.parcel_type", "Bulk"]}, 1 , 0]}
                    },
                    'count_non_bulk' : {
                        $sum : { $cond :[ {$eq : ["$parcel.parcel_type", "Non-bulk"]}, 1 , 0]}
                    }

                }
            },
            {
                $lookup:
                 {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "user_details"
                 }
            },
            {
                $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$user_details", 0]}, "$$ROOT" ]}}
            },
            {

                $project: {
                    'count_non_bulk' : 1,
                    'count_bulk' : 1,
                    'first_name' : "$first_name",
                    'middle_name' : "$middle_name",
                    'last_name' : "$last_name",
                    'email' : "$email"
                }

            },
            {
                $sort: {
                    'first_name' : 1,
                    'last_name' : 1
                }
            }
           
        
        ])
         
        return res.send({ status: 200, data: data});
        
    } catch (error) {
            return res.send({error: error});
    }

});



app.post("/retrieve-parcel-data", async(req, res)=> {

    const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});

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
        '$lookup' : {
            from: "users",
            localField: "_id",
            foreignField: "email",
            as: "user_details"
        }
      },
      {
          $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$user_details", 0]}, "$$ROOT" ]}}
      },

      {
        '$lookup' : {
            from: "assigned_parcels",
            let: {select_user: "$_id", select_date: dateToday},
            pipeline: [
                { $match:
                   { $expr: 
                    { $and:[
                        {$eq: ["$user", "$$select_user"]},
                        {$eq: ["$date", "$$select_date"]},
                     ]
                    }
                   }
                },
                // {$project: { user: 0, date: 0}}
            ],
            as: "total_assigned"
        }
      },
      {
        $replaceRoot: {newRoot: { $mergeObjects: [{ $arrayElemAt: ["$total_assigned", 0]}, "$$ROOT" ]}}
      },

      {
        '$project': {
          'user': "$_id",
          'first_name' : "$first_name",
          'middle_name' : "$middle_name",
          'last_name' : "$last_name",
          'count_bulk' : 1,
          'count_non_bulk' : 1,
          '_id': 0,
          'assigned_parcel' : { '$ifNull': ["$assigned_parcel_count", "no data"]}

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




app.post("/send-otp-register", async(req, res)=> {
    const { email} = req.body;

    const oldUser = await User.findOne({email:email});
    
    if (oldUser) return res.send({data:"User already exist!"});

    try {

        var code = Math.floor(100000 + Math.random() * 900000);   
        code = String(code);
        code = code.substring(0,4);

      const info = await transporter.sendMail({
        from: {
            name: "BMPower",
            address: process.env.Email
        }, 
        to: email, 
        subject: "OTP code", 
        html: "<b>Your OTP code is</b> " + code + "<b>. Do not share this code with others.</b>", 

    });
        return res.send({status : 200, data: info, email: email, code: code});
    } catch (error) {
        
            return res.send({error: error});
    }

});


app.post("/send-otp-forgot-password", async(req, res)=> {
    const { email} = req.body;

    const oldUser = await User.findOne({email:email});
    
    if (!oldUser) return res.send({status:422, data:"User doesn't exist!"});

    try {

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
        html: "<b>Your OTP code is</b> " + code + "<b>. Do not share this code with others.</b>",

    });
        return res.send({status : 200, data: info, email: email, code: code});
    } catch (error) {
        
            return res.send({error: error});
           
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


app.post("/register-user-admin", async(req, res) => {
    const {first_name, middle_name, last_name, email, phone, address, password} = req.body;
    const encryptedPassword = await bcrypt.hash(password, 8);

    const oldUser = await User.findOne({email:email});

    const dateNow =  new Date();
    
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
            isActivate: false,
            j_date : dateNow,
            type : 2
        });
        res.send({status: 200, data:"User Created"})
    } catch (error) {
        res.send({ status: "error", data: error});
    }
});

app.post("/get-user-data-dashboard", async(req, res) => {

    const {email} = req.body;

    var week = moment.tz("Asia/Manila").week(); 
     

    try {
    const userParcel = await Parcel.aggregate([
      { '$match': {'user' : email}},
      { '$unwind': "$parcel" },

      {
        '$group': {
         '_id': {weekNumber : "$parcel.weekNumber"},
         'parcel_non_bulk_count' : {'$sum': {'$sum' : "$parcel.parcel_non_bulk_count"}},
         'parcel_bulk_count' : {'$sum': {'$sum' : "$parcel.parcel_bulk_count"}},
         'total_parcel' : {'$sum': {'$sum' : "$parcel.total_parcel"}}
           },
      },
      {
        '$project': {
          'week': "$_id",
          'parcel_non_bulk_count' : "$parcel_non_bulk_count",
          'parcel_bulk_count' : "$parcel_bulk_count",
          'total_parcel' : "$total_parcel",
          '_id': 0
        }
      },
    {
        '$match' : {"week.weekNumber" : week}
    },
      {
        '$sort':{
            'user' : 1
        }
      }
    ]);


    const userParcelPerDay = await Parcel.aggregate([
        { '$match': {'user' : email}},
        { '$unwind': "$parcel" },
        {'$match': {'parcel.weekNumber' : week}},
        {'$group': {
            _id: "$parcel.weekday",
            parcel: {"$addToSet" : "$parcel.total_parcel"}
            }
        },
        {
         '$project': {
            '_id' : 1,
            'parcel' : 1
         }
        }

    ]);

    console.log("Found parcels:", userParcel);
    return res.status(200).json({ status: 200, data: userParcel, userParcelPerDay: userParcelPerDay });

    } catch (error) {
                return res.send({error: error});
        }

});


app.post("/update-all-user-type", async(req, res) => {
    try{
    const updateData  = await User.updateMany(
        { 

        },
        {
        $set: { type: 1
        }
    });
    return res.status(200).json({ status: 200, data: updateData });

  } catch (error) {
    return res.send({error: error});
}


});


app.post("/update-all-hub", async(req, res) => {
    try{
    const updateData  = await User.updateMany(
        { 

        },
        {
        $set: { hub_id: ""
        }
    });
    return res.status(200).json({ status: 200, data: updateData });

  } catch (error) {
    return res.send({error: error});
}


});


app.listen(8082, () => {
    
  
    var checkDate = moment(new Date()).week();
    const dateToday = new Date().toLocaleString('en-us',{weekday: 'narrow', timeZone:'Asia/Manila'});
    var a = moment.tz("Asia/Manila").week(); 
    var weekDayName =  moment().tz("Asia/Manila").format('dddd');

    console.log(weekDayName);
    console.log("node js server started");
    console.log(process.env.email) 

});  