const mongoose = require("mongoose");

const ParcelInputSchema = new mongoose.Schema({
    parcel: Array,
    assigned_parcel_non_bulk_count: Number,
    assigned_parcel_bulk_count: Number,
    assigned_parcel_total: Number,
    delivered_parcel_non_bulk_count: Number,
    delivered_parcel_bulk_count: Number,
    delivered_parcel_total: Number,
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