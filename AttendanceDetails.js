const mongoose = require("mongoose");

const AttendanceDetailSchema = new mongoose.Schema({
    user: String,
    wdate: String,
    date: String,
    time_in: String,
    time_out: String
},{
    collection:"attendances"
});

mongoose.model("attendances", AttendanceDetailSchema);

