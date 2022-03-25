import DOM from './dom'
import Contract from './contract'
import './flightsurety.css'
;(async () => {
  let result = null

  let contract = new Contract('localhost', () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result)
      display('Operational Status', 'Check if contract is operational', [
        { label: 'Operational Status', error: error, value: result },
      ])
    })

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let flight = DOM.elid('flight-number').value
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display('Oracles', 'Trigger oracles', [
          {
            label: 'Fetch Flight Status',
            error: error,
            value: result.flight + ' ' + result.timestamp,
          },
        ])
      })
    })

    // User-submitted transaction
    DOM.elid('fund-airline').addEventListener('click', () => {
      let airlineAddr = DOM.elid('airline-addr').value
      let airlineFund = DOM.elid('airline-fund').value
      // Write transaction
      contract.fundAirline(airlineAddr, airlineFund, (error, result) => {
        display('Fundings', 'Airline fundings', [
          {
            label: 'Fund Airline',
            error: error,
            value: result.airlineAddr + ' ' + result.value,
          },
        ])
      })
    })

    // User-submitted transaction
    // Purchase Insurance
    DOM.elid('insur-buy').addEventListener('click', () => {
      let airlineAddr = DOM.elid('airline-addr').value
      let flight = DOM.elid('flight-number').value
      let insurAmt = DOM.elid('insur-amt').value
      // Write transaction
      contract.purchaseInsurance(
        airlineAddr,
        flight,
        insurAmt,
        (error, result) => {
          display('Purchased', 'Policy premium', [
            {
              label: 'Insured Amt',
              error: error,
              value: result.flight + ' ' + result.value,
            },
          ])
        }
      )
    })

    // User-submitted transaction
    // Withdraw Paidout
    DOM.elid('insur-withdraw').addEventListener('click', () => {
      // Write transaction
      contract.withdrawPaidout((error, result) => {
        display('Withdraw', 'Paid out', [
          {
            label: 'Full Amount (if any)',
            error: error,
            value: result,
          },
        ])
      })
    })
  })
})()

function display(title, description, results) {
  let displayDiv = DOM.elid('display-wrapper')
  let section = DOM.section()
  section.appendChild(DOM.h2(title))
  section.appendChild(DOM.h5(description))
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: 'row' }))
    row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label))
    row.appendChild(
      DOM.div(
        { className: 'col-sm-8 field-value' },
        result.error ? String(result.error) : String(result.value)
      )
    )
    section.appendChild(row)
  })
  displayDiv.append(section)
}
