// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressString.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Bsc 0xd6228A92dBFA8F98A3e013B1706F3E6762A20B57
//celo 0x909064cF6276d1D2B8Fe7ECEAdFbb77d8b9e9546

contract SendAckSender is AxelarExecutable {
    using StringToAddress for string;
    using AddressToString for address;

    error NotEnoughValueForGas();

    event ContractCallSent(string destinationChain, string contractAddress, bytes payload, uint256 nonce);
    event FalseAcknowledgment(string destinationChain, string contractAddress, uint256 nonce);

    address owner =0xaB8a67743325347Aa53bCC66850f8F13df87e3AF;
    address USDT_CELO = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;

    uint256 public nonce;
    mapping(uint256 => bool) public executed;
    mapping(uint256 => bytes32) public destination;
    IAxelarGasService public immutable gasService;
    string public thisChain;

    constructor(address gateway_, address gasReceiver_, string memory thisChain_) AxelarExecutable(gateway_) {
        gasService = IAxelarGasService(gasReceiver_);
        thisChain = thisChain_;
    }

    function _getDestinationHash(string memory destinationChain, string memory contractAddress) internal pure returns (bytes32) {
        return keccak256(abi.encode(destinationChain, contractAddress));
    }

        function sendContractCall(string calldata destinationChain, string calldata contractAddress,uint256 amount,string memory pair,
        address receiver) external payable {
        uint256 nonce_ = nonce;
        require(IERC20(USDT_CELO).transferFrom(msg.sender, address(this), amount),"Token transfer failed");
       
        uint256 amount18 = amount * 1e12;

          bytes memory payload = abi.encode(amount18,pair, receiver);

        if (msg.value == 0) revert NotEnoughValueForGas();

        gasService.payNativeGasForContractCall{ value: msg.value }(
            address(this),
            destinationChain,
            contractAddress,
            payload,
            msg.sender
        );

        gateway().callContract(destinationChain, contractAddress, payload);
        emit ContractCallSent(destinationChain, contractAddress, payload, nonce_);
        destination[nonce_] = _getDestinationHash(destinationChain, contractAddress);
        nonce = nonce_ + 1;
    }

    function _execute(
        bytes32 /*commandId*/,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        uint256 nonce_ = abi.decode(payload, (uint256));
        if (destination[nonce_] != _getDestinationHash(sourceChain, sourceAddress)) {
            emit FalseAcknowledgment(sourceChain, sourceAddress, nonce_);
            return;
        }
        executed[nonce_] = true;
        //get some gas back.
        destination[nonce_] = 0;
    }

    function claimTokens() public {
        require(msg.sender == owner, "Not allowed");

        uint256 balance = IERC20(USDT_CELO).balanceOf(address(this));
        
        require(IERC20(USDT_CELO).transfer(owner, balance), "Transfer failed");
    }
}