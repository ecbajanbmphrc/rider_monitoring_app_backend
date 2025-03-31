const BUCKET = process.env.BUCKET;

// AWS.config.update({region:'us-east-1'});

const { memoryStorage } = require("multer");
const multer = require("multer");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
require("./UserDetails");
require("./AttendanceDetails");
require("./ParcelDetails");
require("./AttendanceInput");
require("./ParcelInput");
require("./ParcelData");
require("./AssignedParcel");
require("./Hub");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
var moment = require("moment-timezone");
app.use(express.json());

var cors = require("cors");
const { pipeline } = require("nodemailer/lib/xoauth2");
const {
  s3UploadReceipt,
  s3UploadScreenshot,
  s3UploadSpxScreenshot,
} = require("./s3");
// const { uploadToS3 } = require("./s3");
const storage = multer.memoryStorage();
// const upload = multer({storage});
const upload = multer({
  storage: storage,
  limits: { fieldSize: 25 * 1024 * 1024 },
});
app.use(cors());

const mongoURI =
  "mongodb+srv://ecbajanbmphrc:EvqZlwFpXxeA6T6i@rmaproductionserverless.phmnjem.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=rmaProductionServerless";
// const mongoURI = "mongodb+srv://ecbajanbmphrc:y7eIFXEbU07QQOln@cluster0.5tjfmk7.mongodb.net/rider_monitoring?retryWrites=true&w=majority&appName=Cluster0";

const User = mongoose.model("users");

const Attendance = mongoose.model("attendances");

const Parcel = mongoose.model("parcels");

const AttendanceInput = mongoose.model("attendanceInput");

const ParcelInput = mongoose.model("parcelInput");

const ParcelData = mongoose.model("parcelData");

const AssignedParcel = mongoose.model("assignedParcel");

const Hub = mongoose.model("hubs");

const JWT_SECRET = "asdfghjklzxcvbnmqwertyuiop";

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Database Connected successfully");
  })
  .catch((e) => {
    console.log(e);
  });

app.get("/", (req, res) => {
  res.send({ status: "started" });
});

app.post("/register-user-detail", async (req, res) => {
  const {
    rider_id,
    rider_type,
    first_name,
    middle_name,
    last_name,
    email,
    phone,
    address,
    password,
  } = req.body;

  const encryptedPassword = await bcrypt.hash(password, 8);

  const oldUser = await User.findOne({ email: email });

  const dateNow = new Date();

  if (oldUser) return res.send({ data: "User already exist!" });

  try {
    await User.create({
      rider_id,
      rider_type,
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      address,
      password: encryptedPassword,
      isActivate: false,
      j_date: dateNow,
      type: 1,
    });
    await Attendance.create({
      user: email,
      attendance: [],
    });
    await Parcel.create({
      user: email,
      parcel: [],
    });
    res.send({ status: 200, data: "User Created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/login-user", async (req, res) => {
  const { email, password } = req.body;
  const oldUser = await User.findOne({ email: email });

  if (!oldUser)
    return res.send({ status: 401, data: "Invalid email or password" });

  if (oldUser.isActivate === false)
    return res.send({ status: 401, data: "User has not been activated yet." });

  if (await bcrypt.compare(password, oldUser.password)) {
    const token = jwt.sign({ email: oldUser.email }, JWT_SECRET);

    if (res.status(201)) {
      console.log(oldUser);
      return res.send({
        status: 200,
        data: token,
        email: oldUser.email,
        first_name: oldUser.first_name,
        middle_name: oldUser.middle_name,
        last_name: oldUser.last_name,
        phone: oldUser.phone,
        address: oldUser.address,
        id: oldUser._id.toString(),
      });
    } else {
      return res.send({ error: "error" });
    }
  }
  {
    return res.send({ status: 401, data: "Invalid user or password" });
  }
});

app.post("/login-admin", async (req, res) => {
  const { email, password } = req.body;
  const oldUser = await User.findOne({ email: email });

  if (!oldUser)
    return res.send({ status: 401, data: "Invalid email or password" });

  if (!oldUser.type === 2)
    return res.send({ status: 401, data: "Invalid User ." });

  if (oldUser.isActivate === false)
    return res.send({ status: 401, data: "User is already deactivated yet." });

  if (await bcrypt.compare(password, oldUser.password)) {
    const token = jwt.sign({ email: oldUser.email }, JWT_SECRET);

    if (res.status(201)) {
      return res.send({
        status: 200,
        data: token,
        email: oldUser.email,
        first_name: oldUser.first_name,
        middle_name: oldUser.middle_name,
        last_name: oldUser.last_name,
        phone: oldUser.phone,
      });
    } else {
      return res.send({ error: "error" });
    }
  }
  {
    return res.send({ status: 401, data: "Invalid user or password" });
  }
});

app.put("/update-status", async (req, res) => {
  const { isActivate, email } = req.body;

  const userEmail = email;
  console.log(userEmail);
  try {
    await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { isActivate: isActivate } }
    );
    res.send({ status: 200, data: "Status updated" });
  } catch (error) {
    res.send({ status: "errorr", data: error });
  }
});

app.put("/update-user-hub", async (req, res) => {
  const { hub_id, email } = req.body;

  const userEmail = email;
  try {
    await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { hub_id: hub_id } }
    );
    res.send({ status: 200, data: "Hub updated" });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", data: error });
  }
});

app.put("/update-user-detail-admin", async (req, res) => {
  const {
    rider_id,
    rider_type,
    first_name,
    middle_name,
    last_name,
    address,
    phone,
    email,
  } = req.body;

  const userEmail = email;

  console.log(req.body);
  try {
    await User.findOneAndUpdate(
      { email },
      {
        $set: {
          rider_id,
          rider_type,
          first_name,
          middle_name,
          last_name,
          address,
          phone,
        },
      }
    );
    res.send({ status: 200, data: "User Detail updated" });
    console.log("true");
  } catch (error) {
    res.send({ status: "errorr", data: error });
    console.log("true");
  }
});

app.put("/update-hub-status", async (req, res) => {
  const { isActivate, id } = req.body;

  try {
    await Hub.findByIdAndUpdate(id, { isActive: isActivate });

    res.send({ status: 200, data: "Status updated" });
  } catch (error) {
    res.send({ status: "errorr", data: error });
  }
});

app.post("/user-data", async (req, res) => {
  const { token } = req.body;

  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userEmail = user.email;

    User.findOne({ email: userEmail }).then((data) => {
      return res.send({ status: 200, data: data });
    });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/get-rider-user", async (req, res) => {
  try {
    const data = await User.aggregate([
      {
        $match: {
          type: 1,
        },
      },
      {
        $lookup: {
          from: "hubs",
          let: {
            hubId: "$hub_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, "$$hubId"],
                },
              },
            },
          ],
          as: "hub_details",
        },
      },
      {
        $project: {
          rider_id: 1,
          rider_type: 1,
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          email: 1,
          phone: 1,
          address: 1,
          isActivate: 1,
          hub_id: 1,
          j_date: 1,
          hub_name: "$hub_details.hub_name",
        },
      },
      {
        $sort: {
          last_name: 1,
        },
      },
    ]);

    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/get-admin-user", async (req, res) => {
  try {
    const data = await User.aggregate([
      {
        $match: {
          type: 2,
        },
      },
      {
        $project: {
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          email: 1,
          phone: 1,
          address: 1,
          isActivate: 1,
          j_date: 1,
        },
      },
    ]);

    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.put("/attendance-input-time-in", upload.array("file"), async (req, res) => {
  const file = req.body;
  const dateNow = new Date();
  const dateToday = new Date().toLocaleString("en-us", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
  const timeNow = new Date().toLocaleString("en-us", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "Asia/Manila",
  });

  console.log("test pic", file.assigned_parcel_screenshot);

  if (file.assigned_parcel_screenshot === "")
    return res.send({
      status: "error",
      data: "Please insert your assigned parcel picture.",
    });

  try {
    const userEmail = file.user;
    const screenshotResult = await s3UploadScreenshot(file);
    if (screenshotResult.statusCode === 200) {
      await AttendanceInput.findOneAndUpdate(
        { user: userEmail },
        {
          $addToSet: {
            attendance: {
              w_date: dateNow,
              date: dateToday,
              assigned_parcel_screenshot: screenshotResult.url,
              time_in: timeNow,
              time_in_coordinates: JSON.parse(file.time_in_coordinates),
              time_out: "",
              time_out_coordinates: JSON.parse(file.time_out_coordinates),
            },
          },
        }
      );
    }
    res.send({ status: 200, data: "Attendance Created" });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", data: error });
  }
});

app.get("/retrieve-user-attendance", async (req, res) => {
  const userEmail = req.query.user;
  const dateToday = new Date().toLocaleString("en-us", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  try {
    const userAttendance = await Attendance.findOne(
      { user: userEmail, "attendance.date": dateToday },
      {
        "attendance.$": 1,
      }
    );

    if (!userAttendance) return res.send({ status: 400, data: "no data" });
    return res.send({ status: 200, data: userAttendance.attendance[0] });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.put("/attendance-input-time-out", async (req, res) => {
  const { user, time_out_coordinates, assignedParcel } = req.body;
  const dateToday = new Date().toLocaleString("en-us", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
  const dateNow = new Date();
  const timeNow = new Date().toLocaleString("en-us", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "Asia/Manila",
  });

  try {
    const userEmail = user;
    await Attendance.findOneAndUpdate(
      { user: userEmail, "attendance.date": dateToday },
      {
        $set: {
          "attendance.$.time_out": timeNow,
          "attendance.$.time_out_coordinates": {
            latitude: time_out_coordinates.latitude,
            longitude: time_out_coordinates.longitude,
          },
        },
      }
    );

    res.send({ status: 200, data: "Attendance Created" });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", data: error });
  }
});

app.post("/parcel-input", upload.array("file"), async (req, res) => {
  try {
    const weekNow = moment.tz("Asia/Manila").week();
    var weekDayName = moment().tz("Asia/Manila").format("dddd");
    const dateNow = Date.parse(new Date());
    const dateToday = new Date().toLocaleString("en-us", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    const file = req.body;
    const receiptResult = await s3UploadReceipt(file);
    const screenshotResult = await s3UploadSpxScreenshot(file);
    const timeNow = new Date().toLocaleString("en-us", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZone: "Asia/Manila",
    });

    if (
      receiptResult.statusCode === 200 &&
      screenshotResult.statusCode === 200
    ) {
      await ParcelInput.findOneAndUpdate(
        { user: file.email },
        {
          $addToSet: {
            parcel: {
              assigned_parcel_non_bulk_count: parseInt(
                file.assigned_parcel_non_bulk_count
              ),
              assigned_parcel_bulk_count: parseInt(
                file.assigned_parcel_bulk_count
              ),
              assigned_parcel_total: parseInt(file.assigned_parcel_total),
              delivered_parcel_non_bulk_count: parseInt(
                file.delivered_parcel_non_bulk_count
              ),
              delivered_parcel_bulk_count: parseInt(
                file.delivered_parcel_bulk_count
              ),
              delivered_parcel_total: parseInt(file.delivered_parcel_total),
              remaining_parcel: parseInt(file.remaining_parcel),
              screenshot: screenshotResult.url,
              receipt: receiptResult.url,
              date: dateToday,
              weekday: weekDayName,
              weekNumber: weekNow,
              w_date: dateNow,
            },
          },
        }
      );

      await Attendance.findOneAndUpdate(
        { user: file.email, "attendance.date": dateToday },
        {
          $set: {
            "attendance.$.time_out": timeNow,
            "attendance.$.time_out_coordinates": JSON.parse(
              file.time_out_coordinates
            ),
          },
        }
      );

      res.send({ status: 200, data: "success eyy", receiptResult });
    }
  } catch (error) {
    console.log(error);
    res.send({ status: "error", data: error });
  }
});

app.post("/retrieve-parcel-input", async (req, res) => {
  const { user } = req.body;

  const dateToday = new Date().toLocaleString("en-us", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
  const weekNow = moment.tz("Asia/Manila").week();
  const weekDayName = moment().tz("Asia/Manila").format("dddd");

  try {
    const parcels = await Parcel.aggregate([
      {
        $match: { user: user },
      },
      {
        $project: {
          user: 1,
          parcel: {
            $filter: {
              input: "$parcel",
              as: "parcel",
              cond: { $eq: ["$$parcel.weekNumber", weekNow] },
            },
          },
        },
      },
      {
        $sort: {
          w_date: 1,
        },
      },
    ]);

    console.log("Found parcels:", parcels);

    return res
      .status(200)
      .json({ status: 200, data: parcels, weekday: weekDayName });
  } catch (error) {
    console.error("Error retrieving parcel data:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/fetch-hub", async (req, res) => {
  try {
    const hubData = await Hub.find();
    return res.send({ status: 200, data: hubData });
  } catch (error) {
    console.error("Error retrieving hub data:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/create-hub", async (req, res) => {
  const { hub_name, address, region, coordinates } = req.body;

  const dateNow = new Date();

  const oldHub = await Hub.findOne({ hub_name: hub_name });

  if (oldHub) return res.send({ data: "Hub already exist!" });

  try {
    await Hub.create({
      w_date: dateNow,
      hub_name,
      region,
      address,
      isActive: true,
      coordinates,
    });

    res.send({ status: 200, data: "Hub Created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/edit-hub", async (req, res) => {
  const { id, hub_name, address, region, coordinates } = req.body;

  try {
    await Hub.findByIdAndUpdate(id, {
      hub_name,
      region,
      address,
      coordinates,
    });

    res.send({ status: 200, data: "Hub Updated" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/retrieve-user-attendance-today", async (req, res) => {
  const { selectDate } = req.body;

  try {
    const attendanceToday = await User.aggregate([
      {
        $match: { $expr: { $and: [{ $eq: ["$isActivate", true] }] } },
      },

      {
        $lookup: {
          from: "attendances",
          let: {
            email: "$email",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$user", "$$email"],
                },
              },
            },

            { $unwind: "$attendance" },
            { $match: { "attendance.date": selectDate } },
          ],
          as: "attendance_info",
        },
      },

      {
        $lookup: {
          from: "parcels",
          let: {
            email: "$email",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$user", "$$email"],
                },
              },
            },

            { $unwind: "$parcel" },
            { $match: { "parcel.date": selectDate } },
          ],
          as: "parcel_info",
        },
      },

      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              { $arrayElemAt: ["$attendance_info", 0] },
              "$$ROOT",
            ],
          },
        },
      },

      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$parcel_info", 0] }, "$$ROOT"],
          },
        },
      },

      {
        $project: {
          date: 1,
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          email: 1,
          proof: {
            $ifNull: ["$attendance.assigned_parcel_screenshot", "no record"],
          },
          timeIn: { $ifNull: ["$attendance.time_in", "no record"] },
          timeInCoordinates: {
            $ifNull: ["$attendance.time_in_coordinates", "no record"],
          },
          timeOut: { $ifNull: ["$attendance.time_out", "no record"] },
          timeOutCoordinates: {
            $ifNull: ["$attendance.time_out_coordinates", "no record"],
          },
          parcel: { $ifNull: ["$parcel.receipt", "no record"] },
          _id: 0,
        },
      },

      {
        $sort: {
          last_name: 1,
        },
      },
    ]);

    console.log("Found parcels:", selectDate);
    return res.send({ status: 200, data: attendanceToday });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/export-attendance-data", async (req, res) => {
  const { start, end } = req.body;

  console.log(start, end);

  try {
    const data = await Attendance.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: [{ $toLong: "$attendance.w_date" }, start] },
              { $lt: [{ $toLong: "$attendance.w_date" }, end] },
            ],
          },
        },
      },

      {
        $addFields: {
          timeInHours: {
            $toLong: {
              $dateFromString: {
                dateString: {
                  $concat: ["$attendance.date", " ", "$attendance.time_in"],
                },
                timezone: "Asia/Manila",
              },
            },
          },
          timeOutHours: {
            $cond: [
              {
                $ne: ["$attendance.time_out", ""],
              },
              {
                $toLong: {
                  $dateFromString: {
                    dateString: {
                      $concat: [
                        "$attendance.date",
                        " ",
                        "$attendance.time_out",
                      ],
                    },
                    timezone: "Asia/Manila",
                  },
                },
              },
              0,
            ],
          },
          day:{
            
                $dayOfMonth:{ 
                    date : "$attendance.w_date",
                    timezone: "Asia/Manila"
                }
            }
          
        },
      },
      {
        $addFields: {
          totalHours: {
            $cond: [
              {
                $ne: ["$attendance.time_out", ""],
              },
              {
                $let: {
                  vars: {
                    cHour: {
                      $toString: {
                        $hour: {
                          $toDate: {
                            $subtract: ["$timeOutHours", "$timeInHours"],
                          },
                        },
                      },
                    },
                    cMinute: {
                      $toString: {
                        $minute: {
                          $toDate: {
                            $subtract: ["$timeOutHours", "$timeInHours"],
                          },
                        },
                      },
                    },
                  },
                  in: { $concat: [ {$cond : [{ $lt : [{$strLenCP : "$$cHour"}, 2,  ]  } , { $concat: [ "0" ,"$$cHour"]} , "$$cHour"]}, ":", {$cond : [{ $lt : [{$strLenCP : "$$cMinute"}, 2,  ]  } , { $concat: [ "0" ,"$$cMinute"]} , "$$cMinute"]}] },
                },
              },
              "00:00",
            ],
          },
          remarks: {
            $cond: [
              {
                $eq: ["$attendance.time_out", ""],
              },
              "NO LOGOUT",
              {
                $cond: [
                  {
                    $gte: [
                      { $subtract: ["$timeOutHours", "$timeInHours"] },
                      14400000,
                    ],
                  },
                  1,

                  "FOR VALIDATION",
                ],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "email",
          as: "user_details",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$user_details", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $lookup: {
          from: "hubs",
          let: {
            hubId: "$hub_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, "$$hubId"],
                },
              },
            },
          ],
          as: "hub_details",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$hub_details", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $project: {
          user: "$email",
          date: "$attendance.date",
          timeIn: "$attendance.time_in",
          timeOut: "$attendance.time_out",
          timeOutHours: "$timeOutHours",
          totalHours: "$totalHours",
          day: "$day",
          remarks: "$remarks",
          hub_name:   "$hub_name" ,
          email: "$user",
          w_date: { $toLong: "$attendance.w_date" },
          rider_id: "$rider_id",
          rider_type: "$rider_type",
          first_name: { $toUpper: "$first_name" },
          middle_name: { $toUpper: "$middle_name" },
          last_name: { $toUpper: "$last_name" },
        },
      },
      {
        $sort: {
          last_name: 1,
          w_date: 1,
        },
      },
    ]);

    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/export-parcel-data", async (req, res) => {
  const { start, end } = req.body;

  try {
    const data = await Parcel.aggregate([
      {
        $unwind: "$parcel",
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: [{ $toLong: "$parcel.w_date" }, start] },
              { $lt: [{ $toLong: "$parcel.w_date" }, end] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "email",
          as: "user_details",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$user_details", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $project: {
          count_non_bulk: 1,
          count_bulk: 1,
          first_name: "$first_name",
          middle_name: "$middle_name",
          last_name: "$last_name",
          email: "$email",
          date: "$parcel.date",
          count_bulk: "$parcel.parcel_bulk_count",
          count_non_bulk: "$parcel.parcel_non_bulk_count",
          count_total_parcel: "$parcel.total_parcel",
          assigned_parcel_count: "$parcel.assigned_parcel_count",
          _id: 0,
        },
      },
      {
        $sort: {
          first_name: 1,
          last_name: 1,
          _id: -1,
        },
      },
    ]);

    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/select-user-date-attendance", async (req, res) => {
  const { user, date } = req.body;

  try {
    const data = await Attendance.aggregate([
      {
        $match: {
          user: user,
        },
      },
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          "attendance.date": date,
        },
      },
      {
        $project: {
          "attendance.time_in": 1,
          "attendance.time_out": 1,
        },
      },
    ]);
    return res.status(200).json({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/view-user-attendance", async (req, res) => {
  const { user } = req.body;

  const userEmail = user;

  try {
    // await Attendance.findOne({user: userEmail})
    // .then((data)=>{
    //     return res.send({ status: 200, data: data.attendance });
    // })

    const data = await Attendance.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          user: userEmail,
        },
      },
      {
        $project: {
          w_date: "$attendance.w_date",
          date: "$attendance.date",
          time_in: { $ifNull: ["$attendance.time_in", null] },
          time_in_coordinates: {
            $ifNull: ["$attendance.time_in_coordinates", null],
          },
          time_out: { $ifNull: ["$attendance.time_out", null] },
          time_out_coordinates: {
            $ifNull: ["$attendance.time_out_coordinates", null],
          },
          proof: { $ifNull: ["$attendance.assigned_parcel_screenshot", null] },
        },
      },
      {
        $sort: {
          w_date: -1,
        },
      },
    ]);
    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/test-index", async (req, res) => {
  const { start, end } = req.body;

  try {
    const data = await Parcel.aggregate([
      {
        $unwind: "$parcel",
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: [{ $toLong: "$parcel.w_date" }, start] },
              { $lt: [{ $toLong: "$parcel.w_date" }, end] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$parcel.date",
          user: { $first: "$user" },
          // 's_date' : {$first :'$parcel.date'},
          count_bulk: {
            $sum: { $cond: [{ $eq: ["$parcel.parcel_type", "Bulk"] }, 1, 0] },
          },
          count_non_bulk: {
            $sum: {
              $cond: [{ $eq: ["$parcel.parcel_type", "Non-bulk"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "email",
          as: "user_details",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$user_details", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $project: {
          count_non_bulk: 1,
          count_bulk: 1,
          first_name: "$first_name",
          middle_name: "$middle_name",
          last_name: "$last_name",
          email: "$email",
        },
      },
      {
        $sort: {
          first_name: 1,
          last_name: 1,
        },
      },
    ]);

    return res.send({ status: 200, data: data });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/retrieve-parcel-data", async (req, res) => {
  // const dateToday = new Date().toLocaleString('en-us',{month:'numeric', day:'numeric' ,year:'numeric', timeZone: 'Asia/Manila'});

  const { selectDate } = req.body;

  try {
    const parcelPerUser = await User.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$isActivate", true] },
              // , { '$eq' : ['$type' , 1]}
            ],
          },
        },
      },

      {
        $lookup: {
          from: "parcels",
          let: {
            email: "$email",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$user", "$$email"],
                },
              },
            },

            { $unwind: "$parcel" },
            { $match: { "parcel.date": selectDate } },
          ],
          as: "parcel_info",
        },
      },

      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$parcel_info", 0] }, "$$ROOT"],
          },
        },
      },

      {
        $project: {
          email: 1,
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          assigned_parcel_non_bulk_count: {
            $ifNull: ["$parcel.assigned_parcel_non_bulk_count", "no record"],
          },
          assigned_parcel_bulk_count: {
            $ifNull: ["$parcel.assigned_parcel_bulk_count", "no record"],
          },
          assigned_parcel_total: {
            $ifNull: ["$parcel.assigned_parcel_total", "no record"],
          },
          delivered_parcel_non_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_non_bulk_count", "no record"],
          },
          delivered_parcel_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_bulk_count", "no record"],
          },
          delivered_parcel_total: {
            $ifNull: ["$parcel.delivered_parcel_total", "no record"],
          },
          screenshot: { $ifNull: ["$parcel.screenshot", "no record"] },
          receipt: { $ifNull: ["$parcel.receipt", "no record"] },
          _id: 0,
        },
      },

      {
        $sort: {
          last_name: 1,
        },
      },
    ]);

    console.log("Found parcels:", selectDate);
    return res.status(200).json({ status: 200, data: parcelPerUser });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/retrieve-user-parcel-data", async (req, res) => {
  const { begin, end, user } = req.body;

  const userEmail = user;

  try {
    const parcelPerUser = await Parcel.aggregate([
      { $match: { user: userEmail } },
      { $unwind: "$parcel" },

      {
        $project: {
          date: "$parcel.date",
          assigned_parcel_non_bulk_count: {
            $ifNull: ["$parcel.assigned_non_bulk_count", "no record"],
          },
          assigned_parcel_bulk_count: {
            $ifNull: ["$parcel.assigned_parcel_bulk_count", "no record"],
          },
          assigned_parcel_total: {
            $ifNull: ["$parcel.assigned_parcel_total", "no record"],
          },
          delivered_parcel_non_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_non_bulk_count", "no record"],
          },
          delivered_parcel_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_bulk_count", "no record"],
          },
          delivered_parcel_total: {
            $ifNull: ["$parcel.delivered_parcel_total", "no record"],
          },
          screenshot: { $ifNull: ["$parcel.screenshot", "no record"] },
          receipt: { $ifNull: ["$parcel.receipt", "no record"] },
          w_date: "$parcel.w_date",
          _id: 0,
        },
      },
      {
        $sort: { w_date: -1 },
      },
    ]);

    console.log("Found parcels:", parcelPerUser);
    return res.status(200).json({ status: 200, data: parcelPerUser });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/retrieve-user-parcel-data-filtered-date", async (req, res) => {
  const { begin, end, user } = req.body;

  const userEmail = user;

  console.log(begin);
  try {
    const parcelPerUser = await Parcel.aggregate([
      { $match: { user: userEmail } },
      { $unwind: "$parcel" },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: [{ $toLong: "$parcel.w_date" }, begin] },
              { $lt: [{ $toLong: "$parcel.w_date" }, end] },
            ],
          },
        },
      },

      {
        $project: {
          date: "$parcel.date",
          assigned_parcel_non_bulk_count: {
            $ifNull: ["$parcel.assigned_non_bulk_count", "no record"],
          },
          assigned_parcel_bulk_count: {
            $ifNull: ["$parcel.assigned_parcel_bulk_count", "no record"],
          },
          assigned_parcel_total: {
            $ifNull: ["$parcel.assigned_parcel_total", "no record"],
          },
          delivered_parcel_non_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_non_bulk_count", "no record"],
          },
          delivered_parcel_bulk_count: {
            $ifNull: ["$parcel.delivered_parcel_bulk_count", "no record"],
          },
          delivered_parcel_total: {
            $ifNull: ["$parcel.delivered_parcel_total", "no record"],
          },
          screenshot: { $ifNull: ["$parcel.screenshot", "no record"] },
          receipt: { $ifNull: ["$parcel.receipt", "no record"] },
          w_date: "$parcel.w_date",
          _id: 0,
        },
      },
      {
        $sort: { w_date: -1 },
      },
    ]);

    console.log("Found parcels:", parcelPerUser);
    return res.status(200).json({ status: 200, data: parcelPerUser });
  } catch (error) {
    return res.send({ error: error });
  }
});

const transporter = nodemailer.createTransport({
  pool: true,
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.Email,
    pass: process.env.Pass,
  },
});

app.post("/send-otp-register", async (req, res) => {
  const { email } = req.body;

  const oldUser = await User.findOne({ email: email });

  if (oldUser) return res.send({ data: "User already exist!" });

  try {
    var code = Math.floor(100000 + Math.random() * 900000);
    code = String(code);
    code = code.substring(0, 4);

    const info = await transporter.sendMail({
      from: {
        name: "BMPower",
        address: process.env.Email,
      },
      to: email,
      subject: "OTP code",
      html:
        "<b>Your OTP code is</b> " +
        code +
        "<b>. Do not share this code with others.</b>",
    });
    return res.send({ status: 200, data: info, email: email, code: code });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/send-otp-forgot-password", async (req, res) => {
  const { email } = req.body;

  const oldUser = await User.findOne({ email: email });

  if (!oldUser) return res.send({ status: 422, data: "User doesn't exist!" });

  try {
    var code = Math.floor(100000 + Math.random() * 900000);
    code = String(code);
    code = code.substring(0, 4);

    const info = transporter.sendMail({
      from: {
        name: "BMPower",
        address: process.env.Email,
      },
      to: email,
      subject: "OTP code",
      html:
        "<b>Your OTP code is</b> " +
        code +
        "<b>. Do not share this code with others.</b>",
    });
    return res.send({ status: 200, data: info, email: email, code: code });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.put("/forgot-password-reset", async (req, res) => {
  const { password, email } = req.body;

  const encryptedPassword = await bcrypt.hash(password, 8);

  const userEmail = email;
  console.log(userEmail);
  try {
    await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { password: encryptedPassword } }
    );
    res.send({ status: 200, data: "Password updated" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/register-user-admin", async (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    email,
    phone,
    address,
    password,
  } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 8);

  const oldUser = await User.findOne({ email: email });

  const dateNow = new Date();

  if (oldUser) return res.send({ data: "User already exist!" });

  try {
    await User.create({
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      address,
      password: encryptedPassword,
      isActivate: false,
      j_date: dateNow,
      type: 2,
    });
    res.send({ status: 200, data: "User Created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/get-user-data-dashboard", async (req, res) => {
  const { email } = req.body;

  var week = moment.tz("Asia/Manila").week();

  try {
    const userParcel = await Parcel.aggregate([
      { $match: { user: email } },
      { $unwind: "$parcel" },

      {
        $group: {
          _id: { weekNumber: "$parcel.weekNumber" },
          delivered_parcel_non_bulk_count: {
            $sum: { $sum: "$parcel.delivered_parcel_non_bulk_count" },
          },
          delivered_parcel_bulk_count: {
            $sum: { $sum: "$parcel.delivered_parcel_bulk_count" },
          },
          delivered_parcel_total: {
            $sum: { $sum: "$parcel.delivered_parcel_total" },
          },
        },
      },
      {
        $project: {
          week: "$_id",
          delivered_parcel_non_bulk_count: "$delivered_parcel_non_bulk_count",
          delivered_parcel_bulk_count: "$delivered_parcel_bulk_count",
          delivered_parcel_total: "$delivered_parcel_total",
          _id: 0,
        },
      },
      {
        $match: { "week.weekNumber": week },
      },
      {
        $sort: {
          user: 1,
        },
      },
    ]);

    const userParcelPerDay = await Parcel.aggregate([
      { $match: { user: email } },
      { $unwind: "$parcel" },
      { $match: { "parcel.weekNumber": week } },
      {
        $group: {
          _id: "$parcel.weekday",
          parcel: { $addToSet: "$parcel.delivered_parcel_total" },
        },
      },
      {
        $project: {
          _id: 1,
          parcel: 1,
        },
      },
    ]);

    console.log("Found parcels:", userParcel);
    return res.status(200).json({
      status: 200,
      data: userParcel,
      userParcelPerDay: userParcelPerDay,
    });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.post("/get-admin-data-dashboard", async (req, res) => {
  try {
    const dateToday = new Date().toLocaleString("en-us", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    const registeredData = await User.find({ type: 1 }).countDocuments();
    const hubData = await Hub.find().countDocuments();
    const activeData = await User.aggregate([
      {
        $match: {
          type: 1,
        },
      },
      {
        $group: {
          _id: "$isActivate",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          value: "$count",
          label: {
            $cond: {
              if: { $eq: ["$_id", true] },
              then: "Active",
              else: "Inactive",
            },
          },
        },
      },
      {
        $sort: {
          label: 1,
        },
      },
    ]);
    const dailyAttendance = await Attendance.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          "attendance.date": dateToday,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const weeklyAttendance = await Attendance.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $group: {
          _id: {
            weekly: {
              $week: {
                date: { $toDate: "$attendance.w_date" },
                timezone: "+0800",
              },
            },
            yearly: {
              $year: {
                date: { $toDate: "$attendance.w_date" },
                timezone: "+0800",
              },
            },
          },

          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.yearly": -1,
          "_id.weekly": -1,
        },
      },
      {
        $match: {
          "_id.weekly": { $gte: 1 },
        },
      },
      {
        $limit: 13,
      },
      {
        $sort: {
          "_id.yearly": 1,
          "_id.weekly": 1,
        },
      },
      {
        $addFields: {
          sWeekly: { $concat: ["wk", { $toString: "$_id.weekly" }] },
        },
      },
      {
        $project: {
          _id: 0,
          key: "$sWeekly",
          value: "$count",
        },
      },
    ]);

    const dailyDelivery = await Parcel.aggregate([
      {
        $unwind: "$parcel",
      },
      {
        $match: {
          "parcel.date": dateToday,
        },
      },
      {
        $group: {
          _id: null,
          delivered: { $sum: "$parcel.delivered_parcel_total" },
        },
      },
      {
        $project: {
          delivered: { $ifNull: ["$delivered", "0"] },
        },
      },
    ]);

    const registryCount = await User.aggregate([
      {
        $match: {
          type: 1,
        },
      },

      {
        $group: {
          _id: {
            monthly: {
              $month: {
                date: "$j_date",
                timezone: "+0800",
              },
            },
            yearly: {
              $year: {
                date: "$j_date",
                timezone: "+0800",
              },
            },
          },

          count: { $sum: 1 },
        },
      },
      {
        $addFields: {
          month: {
            $let: {
              vars: {
                monthsInString: [
                  ,
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sept",
                  "Oct",
                  "Nov",
                  "Dec",
                ],
              },
              in: {
                $arrayElemAt: ["$$monthsInString", "$_id.monthly"],
              },
            },
          },
        },
      },
      {
        $sort: {
          "_id.yearly": 1,
          "_id.monthly": 1,
        },
      },
    ]);
    return res.status(200).json({
      status: 200,
      registeredData: registeredData,
      hubData: hubData,
      activeData: activeData,
      dailyAttendance: dailyAttendance,
      dailyDelivery: dailyDelivery,
      weeklyAttendance: weeklyAttendance,
      registryCount: registryCount,
    });
  } catch (error) {
    console.log(error);
    return res.send({ error: error });
  }
});

app.put("/update-user-attendance", async (req, res) => {
  const { date, user, time_in, time_out, dExist, nDate } = req.body;

  const newDate = new Date(`${nDate}`);
 
  const userEmail = user;

  console.log("date", newDate);

  try {
    if (dExist) {
      await Attendance.findOneAndUpdate(
        { user: userEmail, "attendance.date": date },
        {
          $set: {
            "attendance.$.time_in": time_in,
            "attendance.$.time_out": time_out,
          },
        }
      );

      return res.send({ status: 200, data: "Status updated" });
    } else {
      await Attendance.findOneAndUpdate(
        { user: userEmail },
        {
          $addToSet: {
            attendance: {
              w_date: newDate,
              date: date,
              time_in: time_in,
              time_out: time_out,
            },
          },
        }
      );
      return res.send({ status: 200, data: "Status updated" });
    }
  } catch (error) {
    console.log(error);
    return res.send({ status: "error", data: error });
  }
});

app.post("/update-all-user-detail", async (req, res) => {
  try {
    const updateData = await User.updateMany(
      {},
      {
        $set: { rider_type: "2WH" },
      }
    );
    return res.status(200).json({ status: 200, data: updateData });
  } catch (error) {
    return res.send({ error: error });
  }
});

app.listen(8082, () => {
  var a = moment.tz("Asia/Manila").week();
  var weekDayName = moment().tz("Asia/Manila").format("dddd");

  console.log("node js server started");

  const date1 = Date.parse("2/12/2025 12:10:00 PM");

  console.log(date1);
});
