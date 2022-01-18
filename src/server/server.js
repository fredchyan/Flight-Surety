// import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
const FlightSuretyApp = require("../../build/contracts/FlightSuretyApp.json");

// import Config from "./config.json";
const Config = require("./config.json");
// import Web3 from "web3";
const Web3 = require("web3");
// import express from "express";
const express = require("express");
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webPackConfig = require("../../webpack.config.server");
const compiler = webpack(webPackConfig);

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

console.log("flightSuretyApp", flightSuretyApp);
flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log("error OracleRequest");
      console.log(error);
    }
    console.log("event OracleRequest");
    console.log(event);
  }
);

const app = express();

// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: webPackConfig.output.publicPath,
  })
);

app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

// Serve the files on port 8080.
app.listen(8080, function () {
  console.log("Example app listening on port 8080!\n");
});

// export default app;
