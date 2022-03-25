const FlightSuretyApp = require('../../build/contracts/FlightSuretyApp.json')

const Config = require('./config.json')
const Web3 = require('web3')
const express = require('express')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webPackConfig = require('../../webpack.config.server')
const compiler = webpack(webPackConfig)
let config = Config['localhost']
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    config.url.replace('http', 'ws').replace('localhost', '127.0.0.1')
  )
)
let ORACLE_START_IDX = 30
let NUM_ORACLE = 30

// Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
let statusCodes = [0, 10, 20, 30, 40, 50]

let accounts = []
let oracles = {}

const initialize = async () => {
  accounts = await web3.eth.getAccounts()
  console.log('accounts', accounts)
  // Register oracles
  for (let i = ORACLE_START_IDX; i < ORACLE_START_IDX + NUM_ORACLE; i++) {
    await flightSuretyApp.methods.registerOracle().send(
      {
        from: accounts[i],
        value: web3.utils.toWei('10', 'ether'),
        gas: 6721975,
      },
      (error, result) => {
        console.log('error', error)
        console.log('result', result)
      }
    )
    let myIdx = await flightSuretyApp.methods.getMyIndexes().call(
      {
        from: accounts[i],
      },
      (error, result) => {
        console.log('error', error)
        console.log('result', result)
      }
    )
    oracles[accounts[i]] = myIdx.map(function (x) {
      return parseInt(x, 10)
    })
  }
  console.log(oracles)
  flightSuretyApp.events.OracleRequest(
    {
      fromBlock: 0,
    },
    function (error, event) {
      if (error) {
        console.log('error OracleRequest')
        console.log(error)
      }
      console.log('event OracleRequest')
      console.log(event)
      let idx = parseInt(event.returnValues.index, 10)
      let airline = event.returnValues.airline
      let flight = event.returnValues.flight
      let ts = event.returnValues.timestamp
      let status = statusCodes[Math.floor(Math.random() * statusCodes.length)]
      for (let i = ORACLE_START_IDX; i < ORACLE_START_IDX + NUM_ORACLE; i++) {
        console.log('sending?', oracles[accounts[i]])
        if (oracles[accounts[i]].includes(idx)) {
          console.log('sending!', idx, airline, flight, ts, status)
          flightSuretyApp.methods
            .submitOracleResponse(idx, airline, flight, ts, status)
            .send(
              {
                from: accounts[i],
                gas: 6721975,
              },
              (error, result) => {
                console.log('error', error)
                console.log('result', result)
              }
            )
        }
      }
    }
  )
  flightSuretyApp.events.FlightStatusInfo(
    {
      fromBlock: 0,
    },
    function (error, event) {
      if (error) {
        console.log('error FlightstatusInfo')
        console.log(error)
      }
      console.log('event FlightstatusInfo')
      console.log(event)
    }
  )
}

config.url.replace('http', 'ws')
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
)
// console.log(flightSuretyApp)

initialize()

const app = express()

// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: webPackConfig.output.publicPath,
  })
)

app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!',
  })
})

// Serve the files on port 8080.
app.listen(8080, function () {
  console.log('Example app listening on port 8080!\n')
})

// export default app;
