import { ethers } from "ethers";
import { request } from "graphql-request";
const AccountLensABI = require("../abi/abi.json");
const ERC20ABI = require("../abi/token.json");
import { AccountInfo,AccountInfoResponse } from "../types/types";
import {getTokenInfo, formatUsdcValue, fetchTrackingActiveAccounts,calculateHealthScore,formatTimeToLiquidation,formatEtherValue } from "../helpers/helper";




export async function getBorrowAndLendInfo(address:string): Promise<string> {
    // Fetch data from subgraph
    const data = await fetchTrackingActiveAccounts(address);
    
    if (data.length === 0) {
        console.log("No data found from subgraph");
        return "No Positions Found,head to [Euler Finance](https://app.euler.finance) to get Started";
    }

    // Use the first (most recent) entry
    const trackingData = data[0];
    
    let accountInfo: AccountInfo[] = [];
    trackingData.borrows.forEach(entry => {
        console.log("Borrow Id:",entry);
        const vault = `0x${entry.substring(42)}`;
        const subAccount = entry.substring(0, 42);
        accountInfo.push({ account: subAccount, vault: vault });
    });

    trackingData.deposits.forEach(entry => {
        console.log("Deposit Id:",entry);
        const vault = `0x${entry.substring(42)}`;
        const subAccount = entry.substring(0, 42);
        accountInfo.push({ account: subAccount, vault: vault });
    });

    let RPC_URL = "https://unichain-rpc.publicnode.com";
    let ACCOUNT_LENS_ADDRESS = "0xFD45d1256F01aE273D32Aa227b36fc25CC358785";
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const accountLens = new ethers.Contract(ACCOUNT_LENS_ADDRESS, AccountLensABI, provider);

    let i = 0;
    let messageString ="<b>Borrow and Lend Positions</b>\n";
    let rewards:number;
    for (const account of accountInfo) {
        try {
            // Get account info which includes liquidity information
            const info = await accountLens.getAccountInfo(account.account, account.vault) as AccountInfoResponse;

            if(info.vaultAccountInfo.isController){
                if(info.accountRewardInfo.enabledRewardsInfo.length > 0){
                    rewards = info.accountRewardInfo.enabledRewardsInfo[0].amount;
                }else{
                    rewards = 0;
                }
                const asset1 = info.vaultAccountInfo.asset;
                const asset2 = info.vaultAccountInfo.liquidityInfo.collateralLiquidityRawInfo[0][0];

                const asset1Info = await getTokenInfo(asset1);
                const asset2Info = await getTokenInfo(asset2);
    
                // Get liquidity info for health analysis
                const liquidityInfo = info.vaultAccountInfo.liquidityInfo;
                // console.log((liquidityInfo));
                if (liquidityInfo.queryFailure) {
                    console.log("\n❌ LIQUIDITY QUERY FAILED:");
                    console.log(`Reason: ${liquidityInfo.queryFailureReason}`);
                    return "No Positions Found,head to  <a href='https://app.euler.finance'>Euler Finance</a> to get Started";
                } else {

                 //   console.log("\n🏥 HEALTH ANALYSIS:");
                    messageString += `<b>\nPosition ${i + 1}</b>\n`;

                    
                    // Calculate health score
                    const healthScore = calculateHealthScore(
                        liquidityInfo.collateralValueLiquidation,
                        liquidityInfo.liabilityValue
                    );
                    
                            //console.log(`Health Score: ${healthScore.toFixed(4)}`);
                            //console.log(`Risk Level: ${healthScore > 1.5 ? '🟢 Safe' : healthScore > 1.1 ? '🟡 Warning' : '🔴 High'}`);
                            
                            //console.log("\n💰 COLLATERAL VALUES:");
                            messageString +=`\n Borrowing Asset : <b>${Number(formatEtherValue(liquidityInfo.liabilityValue)).toFixed(2)}</b> ${asset1Info.symbol}`;
                    messageString +=`\n Collateral Asset : <b>${Number(formatEtherValue(liquidityInfo.collateralValueRaw)).toFixed(2)}</b> ${asset2Info.symbol}`;

                    messageString +=`\n Health Score : ${healthScore.toFixed(3)}`;
                    messageString +=`\n <b>Risk Level</b> : ${healthScore > 1.5 ? '🟢 Safe\n' : healthScore > 1.1 ? '🟡 Moderate\n' : '🔴 <b>High</b>\n'}`;
                  
                }
            }
            i++;
            
        } catch (error) {
            console.error(`❌ Error processing account ${account.account}:`, error);
        }
    }
    let rewardString:string;
    //@ts-ignore
    if(rewards ==undefined || rewards ==0){
        rewardString = `You have no rewards to claim \n Go to <a href="https://app.euler.finance">Euler Finance</a> to manage your positions\n`;}
    else{
        rewardString = `You have earned ${rewards} rEul tokens \n Go to <a href="https://app.euler.finance">Euler Finance</a> to Borrow/Manage your assets\n`; 
    }
    messageString = messageString + "\n" + rewardString;
 return messageString;
}






