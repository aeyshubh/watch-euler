import { ethers } from "ethers";
import { request } from "graphql-request";
const AccountLensABI = require("../abi.json");
const ERC20ABI = require("../token.json");
import { AccountInfo,AccountInfoResponse } from "../types/types";
import {getTokenInfo, formatUsdcValue, fetchTrackingActiveAccounts } from "../helpers/helper";




export async function getLendInfo(address:string): Promise<string> {
    // Fetch data from subgraph
    const data = await fetchTrackingActiveAccounts(address);
    
    if (data.length === 0) {
        console.log("No data found from subgraph");
        return "No Positions Found,head to [Euler Finance](https://app.euler.finance) to get Started";
    }

    // Use the first (most recent) entry
    const trackingData = data[0];
    
    let accountInfo: AccountInfo[] = [];

    trackingData.deposits.forEach(entry => {
       // console.log("Deposit Id:",entry);
        const vault = `0x${entry.substring(42)}`;
        const subAccount = entry.substring(0, 42);
        accountInfo.push({ account: subAccount, vault: vault });
    });

    let RPC_URL = "https://unichain-rpc.publicnode.com";
    let ACCOUNT_LENS_ADDRESS = "0xFD45d1256F01aE273D32Aa227b36fc25CC358785";
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const accountLens = new ethers.Contract(ACCOUNT_LENS_ADDRESS, AccountLensABI, provider);

    let i = 0;
    let messageString ="<b>Lending Positions</b>\n\n";
        let rewards:number;
    for (const account of accountInfo) {
        try {
            // Get account info which includes liquidity information
            const info = await accountLens.getAccountInfo(account.account, account.vault) as AccountInfoResponse;
            rewards = 0;
            if(info.accountRewardInfo.enabledRewardsInfo.length > 0){
                rewards = info.accountRewardInfo.enabledRewardsInfo[0].amount;
            }
            if(info.vaultAccountInfo.assetsAccount > 0){
            messageString += `POSITION ${i + 1}\n`;
                

                const asset1 = info.vaultAccountInfo.asset;  
                const asset1Info = await getTokenInfo(asset1);
              //  console.log("You have lend : ", formatUsdcValue(info.vaultAccountInfo.assets.toString())+ " " + asset1Info.symbol);
                messageString += `\nYou have lend : <b>${formatUsdcValue(info.vaultAccountInfo.assets.toString()).toFixed(2)}</b> ${asset1Info.symbol}\n`;
            i++;

            }else{
                
            }
            
        } catch (error) {
            console.error(`❌ Error processing account ${account.account}:`, error);
        }
    }
    let rewardsString:string;
    //@ts-ignore
    if(rewards ==undefined || rewards ==0){
        rewardsString = `You have no rewards to claim \n Go to <a href="https://app.euler.finance">Euler Finance</a> to get started`;}
    else{
        rewardsString = `You have earned ${rewards} rEul tokens \n Go to <a href="https://app.euler.finance">Euler Finance</a> to Borrow/Manage your assets`; 
    }
    messageString = messageString + "\n" + rewardsString;

 return messageString;
}






