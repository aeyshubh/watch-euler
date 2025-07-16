import {TrackingActiveAccount,GraphQLResponse,tokenInfo} from "../types/types"
import { ethers } from "ethers";
import { request } from "graphql-request";
const ERC20ABI = require("../abi/token.json");

export function calculateHealthScore(collateralValueLiquidation: string, liabilityValue: string): number {
    const collateral = parseFloat(ethers.formatEther(collateralValueLiquidation));
    const liability = parseFloat(ethers.formatEther(liabilityValue));
    
    if (liability === 0) return Infinity;
    return collateral / liability;
}

export async function fetchTrackingActiveAccounts(address:string): Promise<TrackingActiveAccount[]> {
    const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_cm4iagnemt1wp01xn4gh1agft/subgraphs/euler-v2-unichain/1.0.2/gn";
    const query = `
        query MyQuery {
            trackingActiveAccounts(
                orderBy: blockTimestamp
                orderDirection: desc
                where: {borrows_not: [], deposits_not: [], id: "${address}"}
            ) {
                blockNumber
                blockTimestamp
                borrows
                deposits
                id
                mainAddress
                transactionHash
            }
        }
    `;

    try {
        const response: GraphQLResponse = await request(SUBGRAPH_URL, query);
        return response.trackingActiveAccounts;
    } catch (error) {
        console.error("Error fetching data from subgraph:", error);
        return [];
    }
}

export async function getTokenInfo(address: string): Promise<tokenInfo> {
    let RPC_URL = "https://unichain-rpc.publicnode.com";
    let provider = new ethers.JsonRpcProvider(RPC_URL);
    let tokenData = new ethers.Contract(address, ERC20ABI, provider);
    let symbol = await tokenData.symbol();
    let decimals = await tokenData.decimals();
   
    return {
        symbol: symbol,
        decimals: Number(decimals)
    }
}

export function formatEtherValue(value: string): string {
    return ethers.formatEther(value);
}

export function formatUsdcValue(value: string): number {
    return Number(value) / 10 ** 6;
}

export function formatTimeToLiquidation(timeToLiquidation: string): string {
    const time = parseInt(timeToLiquidation);
    if (time === -1) return "No liquidation risk";
    if (time === 0) return "At liquidation threshold";
    if (time < 0) return "Past liquidation threshold";
    return "No liquidation risk";
}
