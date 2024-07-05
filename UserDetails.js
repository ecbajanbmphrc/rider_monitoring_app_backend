const mongoose = require("mongoose");

const UserDetailSchema = new mongoose.Schema({
    first_name: String,
    middle_name: String,
    last_name: String,
    email:
    { type: String, 
      unique: true
    },
    phone: String,
    address: String,
    password: String,
    isActivate: Boolean,
    j_date : Date,
    hub_id : String,
    type: Number
},{
    collection:"users"
});

mongoose.model("users", UserDetailSchema);
