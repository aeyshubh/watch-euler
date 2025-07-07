// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Axelar gateway 0x304acf330bbE08d1e512eefaa92F6a57871fD895
//0x909064cF6276d1D2B8Fe7ECEAdFbb77d8b9e9546
        interface IPoolFactory {
    function poolsByPair(address asset0, address asset1) external view returns (address pool);
    }
interface IEulerSwap {
    function swapExactIn(
        address eulerSwap,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address receiver,
        uint256 amountOutMin,
        uint256 deadline
    ) external;
}

contract SendAckReceiver is AxelarExecutable {

    constructor(address gateway_) AxelarExecutable(gateway_) {}
    
    address euler_factory_Contract= 0x3e378e5E339DF5e0Da32964F9EEC2CDb90D28Cc7;
    address binance_euler_periphery = 0xa8826Bb29f875Db4c4b482463961776390774525;
    address euler_swapContract = 0xa8826Bb29f875Db4c4b482463961776390774525;
    address EulerpoolAddress = 0x5B152Ccd3418E53D796D7933248Ed29bd47C68a8;
    address owner = 0xaB8a67743325347Aa53bCC66850f8F13df87e3AF;

    function _execute(
        bytes32 /*commandId*/,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
     (uint256 _amt,string memory _pair,address a1) = abi.decode(payload, (uint256,string,address));

        executeEulerSwap(_pair,_amt,a1);
    }

    function getPoolAddress(address tokenA, address tokenB) public view returns (address pool) {
        pool = IPoolFactory(euler_factory_Contract).poolsByPair(tokenA, tokenB);
        return pool;
}

    function executeEulerSwap(string memory _pair,uint256 _amount,address _receiver) internal  {
        
       // USDT 0x55d398326f99059fF775485246999027B3197955;
       //  USD1 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
        address t1;
        address t2;
         bytes memory pairBytes = bytes(_pair);
         uint256 splitIndex = 0;

    for (uint256 i = 0; i < pairBytes.length; i++) {
        if (pairBytes[i] == "-") {
            splitIndex = i;
            break;
        }
    }

    bytes memory token0Bytes = new bytes(splitIndex);
    bytes memory token1Bytes = new bytes(pairBytes.length - splitIndex - 1);

    for (uint256 i = 0; i < splitIndex; i++) {
        token0Bytes[i] = pairBytes[i];
    }

    for (uint256 i = splitIndex + 1; i < pairBytes.length; i++) {
        token1Bytes[i - splitIndex - 1] = pairBytes[i];
    }

        string memory token0 = string(token0Bytes);
        string memory token1 = string(token1Bytes);


      //  Correct string comparison using keccak256
        if (keccak256(bytes(token0)) == keccak256(bytes("USDT"))) {
            t1 = 0x55d398326f99059fF775485246999027B3197955; // NOTE: This is USDT on BSC, not BUSD
        } else {
            // Optional: handle fallback case
        }

        if (keccak256(bytes(token1)) == keccak256(bytes("USD1"))) {
            t2 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
        } else {
            // Optional: handle fallback case
        }
               IERC20(t1).approve(euler_swapContract, _amount);

        uint256 tempNumber = _amount;
        address rec = _receiver;

        IEulerSwap(euler_swapContract).swapExactIn(
        EulerpoolAddress,
        t1, 
        t2,
        tempNumber,                        
        rec, 
        tempNumber,                       
        0                                          
    );

    }


    function claimTokens() public {
        require(msg.sender == owner, "Not allowed");

        address token = 0x55d398326f99059fF775485246999027B3197955;
        uint256 balance = IERC20(token).balanceOf(address(this));
        
        require(IERC20(token).transfer(owner, balance), "Transfer failed");
    }

}
