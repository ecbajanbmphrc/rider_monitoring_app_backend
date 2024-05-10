const mongoose = require("mongoose");

const AttendanceDetailSchema = new mongoose.Schema({
    user: String,
    wdate: String,
    date: String,
    time_in: String,
    time_out: String,
    time_in_latitude: 
     {
        type: Number
     },
    time_in_longitude: 
     {
        type: Number
     },
    time_out_latitude: 
     {
        type: Number
     },
    time_out_longitude:
     {
        type: Number
     }
},{
    collection:"attendances"
});

mongoose.model("attendances", AttendanceDetailSchema);

