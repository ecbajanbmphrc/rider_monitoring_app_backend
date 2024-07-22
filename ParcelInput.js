const mongoose = require("mongoose");

const ParcelInputSchema = new mongoose.Schema({
    parcel: Array,
    parcel_non_bulk_count: Number,
    parcel_bulk_count: Number,
    assigned_parcel_count: Number,
    total_parcel : Number,
    remaining_parcel: Number,
    screenshot: String,
    receipt : Array,
    date: String,
    weekday : String,
    weekNumber : Number,
    w_date : Date

},{
    collection:"parcels"
});

mongoose.model("parcelInput", ParcelInputSchema);