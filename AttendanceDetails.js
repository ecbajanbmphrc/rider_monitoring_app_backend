const mongoose = require("mongoose");

const AttendanceDetailSchema = new mongoose.Schema({
    user: String,
    date: String
},{
    collection:"attendances"
});

mongoose.model("attendances", AttendanceDetailSchema);

