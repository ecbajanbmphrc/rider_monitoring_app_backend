const mongoose = require("mongoose");

const AttendanceDetailSchema = new mongoose.Schema({
    user: String,
    wdate: String,
    date: String,
    time_in: String,
    time_out: String,
    time_in_latitude: String,
    time_in_longitude: String,
    time_out_latitude: String,
    time_out_longitude: String
},{
    collection:"attendances"
});

mongoose.model("attendances", AttendanceDetailSchema);

