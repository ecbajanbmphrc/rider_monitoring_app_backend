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
    password: String
},{
    collection:"users"
});

mongoose.model("users", UserDetailSchema);

