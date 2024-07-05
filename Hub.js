const mongoose = require("mongoose");

const HubSchema = new mongoose.Schema({
    w_date: Date,
    hub_name: String,
    address: String,
    region: String,
    isActive: Boolean,
    coordinates: 
     {
        latitude: Number,
        longitude: Number
     },
},{
    collection: "hubs"
});

mongoose.model("hubs", HubSchema);