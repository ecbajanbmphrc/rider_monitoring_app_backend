const mongoose = require("mongoose");

const ParcelDataSchema = new mongoose.Schema({
    user : String,
    parcel: [
         {       
        parcel_count : Number,
        date : Date,
        parcel_type: String
         }

    ]
},{
    collection:"parcels"
});

mongoose.model("parcelData", ParcelDataSchema);



