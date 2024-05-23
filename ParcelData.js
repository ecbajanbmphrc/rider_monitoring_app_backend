const mongoose = require("mongoose");

const ParcelDataSchema = new mongoose.Schema({
    user : String,
    parcel: [
         {       
        parcel_count : Number,
        date : String,
        parcel_type: String
         }

    ]
},{
    collection:"parcels"
});

mongoose.model("parcelData", ParcelDataSchema);



