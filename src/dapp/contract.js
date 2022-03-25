import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import Config from './config.json'
import Web3 from 'web3'

export default class Contract {
  constructor(network, callback) {
    let config = Config[network]
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url))
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    )
    this.initialize(callback)
    this.owner = null
    this.airlines = []
    this.passengers = []
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0]

      let counter = 1

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++])
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++])
      }

      callback()
    })
  }

  isOperational(callback) {
    let self = this
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback)
  }

  fetchFlightStatus(flight, callback) {
    let self = this
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    }
    console.log(
      'Fetch flight status, airline:',
      payload.airline,
      ' flight: ',
      payload.flight,
      ' timestamp: ',
      payload.timestamp
    )
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload)
      })
  }

  fundAirline(airlineAddr, value, callback) {
    let self = this
    let payload = {
      airline: airlineAddr,
      value: value,
    }
    console.log(self.web3.utils.toWei('10', 'ether'))
    console.log(payload)
    self.flightSuretyApp.methods.fundAirline().send(
      {
        from: payload.airline,
        value: self.web3.utils.toWei(value, 'ether'),
        gas: 6721975,
      },
      (error, result) => {
        console.log(error)
        callback(error, payload)
      }
    )
  }

  purchaseInsurance(airline, flight, value, callback) {
    let self = this
    let payload = {
      airline: airline,
      flight: flight,
    }
    self.flightSuretyApp.methods
      .buyInsurance(payload.airline, payload.flight)
      .send(
        {
          from: self.passengers[0],
          value: self.web3.utils.toWei(value, 'ether'),
          gas: 6721975,
        },
        (error, result) => {
          console.log(error)
          callback(error, payload)
        }
      )
  }

  withdrawPaidout(callback) {
    let self = this
    let payload = {}
    self.flightSuretyApp.methods.withdrawPaidout().send(
      {
        from: self.passengers[0],
        gas: 6721975,
      },
      (error, result) => {
        console.log(error)
        callback(error, payload)
      }
    )
  }
}
