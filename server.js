const axios = require("axios");
const mongoose = require("mongoose");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);

client.messages
  .create({
     body: 'You should water it now!',
     from: '+',
     to: '+'
   })
  .then(message => console.log(message.sid))
  .done();


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

mongoose.connect(
  "mongodb://localhost/watereasy",
  { useNewUrlParser: true }
);
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("connected successfully");
});

var sensorSchema = new mongoose.Schema({
  light: String,
  soil: String,
  temperature: String,
  humidity: String,
  time: { type: Date, default: Date.now }
});

var Sensor = mongoose.model("Sensor", sensorSchema);

setInterval(function() {
  getLightSensorData();
}, 7000);

function getLightSensorData() {
  axios
    .get("http://192.168.43.82/")
    .then(function(response) {
      const data = response.data;
      const type = { 0: "light", 1: "soil", 2: "temperature", 3: "humidity" };
      let res = {};
      data.split(" ").forEach((data, i) => {
        res[type[i]] = data;
      });

      const toSave = new Sensor(res);
      toSave.save();
      io.emit("sensor data", res);

      if(Number(res.soil) > 1900) {
        client.messages
        .create({
           body: `You should water it now, you mositure level is ${res.soil} only!`,
           from: '+',
           to: '+'
         })
        .then(message => console.log(message.sid))
        .done();
      }
    })
    .catch(function(error) {
      console.log("error");
    });
}

app.get("/", function(req, res) {
  res.send("<h1>Hello world</h1>");
});

app.get("/api/sensordata", function(req, res) {
    console.log("request made");
  Sensor.find({},{'_id': 0})
    .sort({ date: -1 })
    .exec(function(err, docs) {
      res.status(200).send(docs);
    });
});

io.on("connection", function(socket) {
  console.log("a user connected");
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
