const mongoose = require("mongoose");

const ParcelInputSchema = new mongoose.Schema({
    parcel: Array,
    parcel_count: String,
    date: String,
    parcel_type: String,
    w_date : Date

},{
    collection:"parcels"
});

mongoose.model("parcelInput", ParcelInputSchema);