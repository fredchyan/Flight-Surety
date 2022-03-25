// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

// import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;
    address rememberFirst;

    struct Airline {
        bool valid;
        bool funded;
        address[] votes;
    }
    mapping(address => Airline) private airlines;
    uint256 numAirlines = 0;

    struct InsurancePolicy {
        address[] insurees;
        uint256[] premium;
        bool credited;
    }
    mapping(bytes32 => InsurancePolicy) private policies;

    mapping(address => uint256) private payout;

    uint256 public constant AIRLINE_FUNDING = 10 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event DebugEvent(address addr, Airline airline, string msg, address rem);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address firstAirline) {
        contractOwner = msg.sender;
        Airline storage newAirline = airlines[firstAirline];
        newAirline.valid = true;
        rememberFirst = firstAirline;
        emit DebugEvent(
            msg.sender,
            airlines[firstAirline],
            "cons",
            rememberFirst
        );
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(
            authorizedContracts[msg.sender] == 1,
            "Caller is not authorized"
        );
        _;
    }

    modifier requireAirline(address addr) {
        // Also allow contract owner, so the first airline can be registered.
        // emit DebugEvent(msg.sender, airlines[msg.sender], "req");
        require(airlines[addr].valid, "Caller is not an airline");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address appCaller, address airline)
        external
        requireAirline(appCaller)
        returns (bool success, uint256 votes)
    {
        // requireIsCallerAuthorized
        emit DebugEvent(
            msg.sender,
            airlines[msg.sender],
            "cons",
            rememberFirst
        );
        require(airlines[appCaller].funded, "Caller airline is not funded");
        require(!airlines[airline].valid, "Airline already registered.");
        emit DebugEvent(
            appCaller,
            airlines[appCaller],
            "in data reg airline ",
            airline
        );
        success = false;
        if (numAirlines < 4) {
            Airline storage newAirline = airlines[airline];
            newAirline.valid = true;
            numAirlines += 1;
            success = true;
        } else {
            Airline storage newAirline = airlines[airline];
            bool isDuplicate = false;
            for (uint256 c = 0; c < newAirline.votes.length; c++) {
                if (newAirline.votes[c] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller has already voted for this airline.");
            newAirline.votes.push(msg.sender);
            votes = newAirline.votes.length;
            success = true;
            if (votes >= (numAirlines + 1) / 2) {
                numAirlines += 1;
                newAirline.valid = true;
            }
        }
        return (success, votes);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(address appCaller, bytes32 flightKey)
        external
        payable
        requireIsCallerAuthorized
    {
        bool isDuplicate = false;
        require(
            policies[flightKey].credited == false,
            "Policy already expired."
        );
        for (uint256 c = 0; c < policies[flightKey].insurees.length; c++) {
            if (policies[flightKey].insurees[c] == appCaller) {
                isDuplicate = true;
                break;
            }
        }
        require(
            !isDuplicate,
            "Insuree already purchased insurance for this flight."
        );
        policies[flightKey].insurees.push(appCaller);
        policies[flightKey].premium.push(msg.value);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flightKey)
        external
        requireIsCallerAuthorized
    {
        require(
            policies[flightKey].credited == false,
            "Policy already credited."
        );
        policies[flightKey].credited = true;
        for (uint256 c = 0; c < policies[flightKey].insurees.length; c++) {
            payout[policies[flightKey].insurees[c]] +=
                (3 * policies[flightKey].premium[c]) /
                2;
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address appCaller) external requireIsCallerAuthorized {
        require(payout[appCaller] > 0, "Nothing to withdraw.");
        uint256 amt = payout[appCaller];
        payout[appCaller] = 0;
        payable(appCaller).transfer(amt);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airline) external payable requireIsCallerAuthorized {
        require(msg.value >= AIRLINE_FUNDING, "Insufficient funding provided.");
        airlines[airline].funded = true;
    }

    function isAirline(address airline) external view returns (bool) {
        return airlines[airline].valid;
    }

    function isAirlineFunded(address airline)
        external
        view
        requireIsCallerAuthorized
        requireAirline(airline)
    {
        require(airlines[airline].funded, "Airline is not funded");
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        revert();
    }
}
