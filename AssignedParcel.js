const mongoose = require("mongoose");

const AssignedParcelSchema = new mongoose.Schema({
        
        user : String,
        date : String,
        w_date : Date,
        assigned_parcel_count: Number
    
},{
    collection:"assigned_parcels"
});

mongoose.model("assignedParcel", AssignedParcelSchema);



