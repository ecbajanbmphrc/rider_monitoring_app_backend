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
    isActivate: Boolean
},{
    collection:"users"
});

mongoose.model("users", UserDetailSchema);
