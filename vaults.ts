const { ethers } = require("ethers");
const { request } = require("graphql-request");
const AccountLensABI = require("./abi.json");
const ERC20ABI = require("./token.json");

interface AccountInfo {
    account: string;
    vault: string;
}

interface tokenInfo{
    symbol: string;
    decimals: number;
}

interface TrackingActiveAccount {
    blockNumber: string;
    blockTimestamp: string;
    borrows: string[];
    deposits: string[];
    id: string;
    mainAddress: string;
    transactionHash: string;
}

interface GraphQLResponse {
    trackingActiveAccounts: TrackingActiveAccount[];
}

interface LiquidityInfo {
    queryFailure: boolean;
    queryFailureReason: string;
    timeToLiquidation: string;
    liabilityValue: string;
    collateralValueBorrowing: string;
    collateralValueLiquidation: string;
    collateralValueRaw: string;
    collateralLiquidityBorrowingInfo: any[];
    collateralLiquidityLiquidationInfo: any[];
    collateralLiquidityRawInfo: any[];
}

interface VaultAccountInfo {
    shares: string;
    borrowed: string;
    isController: boolean;
    assetsAccount: number;
    isCollateral: boolean;
    asset: string;
    assets : number;
    liquidityInfo: LiquidityInfo;
    assetValue: any;
}

interface AccountInfoResponse {
    evcAccountInfo: {
        owner: string;
        evc: string;
        account: string;
    };
    vaultAccountInfo: VaultAccountInfo;
    accountRewardInfo: {
        enabledRewardsInfo: any[];
    };
}

const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_cm4iagnemt1wp01xn4gh1agft/subgraphs/euler-v2-unichain/1.0.2/gn";

async function fetchTrackingActiveAccounts(): Promise<TrackingActiveAccount[]> {
    const query = `
        query MyQuery {
            trackingActiveAccounts(
                orderBy: blockTimestamp
                orderDirection: desc
                where: {borrows_not: [], deposits_not: [], id: "0xaB8a67743325347Aa53bCC66850f8F13df87e3AF"}
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

function calculateHealthScore(collateralValueLiquidation: string, liabilityValue: string): number {
    const collateral = parseFloat(ethers.formatEther(collateralValueLiquidation));
    const liability = parseFloat(ethers.formatEther(liabilityValue));
    
    if (liability === 0) return Infinity;
    return collateral / liability;
}

async function getTokenInfo(address: string): Promise<tokenInfo> {
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

function formatEtherValue(value: string): string {
    return ethers.formatEther(value);
}

function formatUsdcValue(value: string): number {
    return Number(value) / 10 ** 6;
}

function formatTimeToLiquidation(timeToLiquidation: string): string {
    const time = parseInt(timeToLiquidation);
    if (time === -1) return "No liquidation risk";
    if (time === 0) return "At liquidation threshold";
    if (time < 0) return "Past liquidation threshold";
    return "No liquidation risk";
}

async function main() {
    // Fetch data from subgraph
    const data = await fetchTrackingActiveAccounts();
    
    if (data.length === 0) {
        console.log("No data found from subgraph");
        return;
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

    console.log("=== EULER V2 POSITION ANALYSIS ===\n");
    console.log(`Address: ${address}`);

    let i = 0;
    for (const account of accountInfo) {
        try {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`POSITION ${i + 1}: ${account.account} -> Valut : ${account.vault}`);
            console.log(`${'='.repeat(80)}`);

            // Get account info which includes liquidity information
            const info = await accountLens.getAccountInfo(account.account, account.vault) as AccountInfoResponse;
            if(info.vaultAccountInfo.isController){
            console.log("\n📊 BASIC ACCOUNT INFO:");
            console.log(`Owner: ${info.evcAccountInfo.owner}`);
            console.log(`EVC: ${info.evcAccountInfo.evc}`);
            console.log(`Vault Shares: ${formatEtherValue(info.vaultAccountInfo.shares)}`);
            console.log("Earned rewards:", info.accountRewardInfo.enabledRewardsInfo);
            console.log("Is Controller:", info.vaultAccountInfo.isController); //for borrow position chek idController to be true
           // console.log("Asset value : ",info.vaultAccountInfo.assetValue)
            
            // console.log("Borrow Addreses ",info.vaultAccountInfo.liquidityInfo.collateralLiquidityBorrowingInfo);
            // console.log("Colletral Addreses ",info.vaultAccountInfo.liquidityInfo.collateralLiquidityRawInfo);
           // console.log("Liquidity Info : ",info.vaultAccountInfo);
          const asset1 = info.vaultAccountInfo.asset;
          const asset2 = info.vaultAccountInfo.liquidityInfo.collateralLiquidityRawInfo[0][0];

         //   const asset2 = info.vaultAccountInfo.liquidityInfo.collateralLiquidityRawInfo[1][0];


                // console.log("Asset 1 : ",asset1);
                // console.log("Asset 2 : ",asset2);
            const asset1Info = await getTokenInfo(asset1);
            const asset2Info = await getTokenInfo(asset2);

            // Get liquidity info for health analysis
            const liquidityInfo = info.vaultAccountInfo.liquidityInfo;
            // console.log((liquidityInfo));
            if (liquidityInfo.queryFailure) {
                console.log("\n❌ LIQUIDITY QUERY FAILED:");
                console.log(`Reason: ${liquidityInfo.queryFailureReason}`);
            } else {
                console.log("\n🏥 HEALTH ANALYSIS:");
                
                // Calculate health score
                const healthScore = calculateHealthScore(
                    liquidityInfo.collateralValueLiquidation,
                    liquidityInfo.liabilityValue
                );
                
                console.log(`Health Score: ${healthScore.toFixed(4)}`);
                console.log(`Risk Level: ${healthScore > 1.5 ? '🟢 Safe' : healthScore > 1.1 ? '🟡 Warning' : '🔴 Danger'}`);
                console.log(`Time to Liquidation: ${formatTimeToLiquidation(liquidityInfo.timeToLiquidation)}`);
                
                console.log("\n💰 COLLATERAL VALUES:");
                console.log(`Borrowing : ${formatEtherValue(liquidityInfo.liabilityValue)} ${asset1Info.symbol}`);
                console.log(`Collateral Value 1 : ${formatEtherValue(liquidityInfo.collateralValueRaw)} ${asset2Info.symbol}`);
              
                
                
            }
        }else{

            if(info.vaultAccountInfo.assetsAccount > 0){
                console.log("Only lend positions : ");
                const asset1 = info.vaultAccountInfo.asset;  
                const asset1Info = await getTokenInfo(asset1);
                console.log("You have lent : ",formatUsdcValue(info.vaultAccountInfo.assets.toString())+ " " + asset1Info.symbol);
            }
        }
            i++;
            
        } catch (error) {
            console.error(`❌ Error processing account ${account.account}:`, error);
        }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ANALYSIS COMPLETE - Processed ${i} positions`);
    console.log(`${'='.repeat(80)}`);
}

// Run the main function
main().catch(console.error);

// 0x7650d7ae1981f2189d352b0ec743b9099d24086f Vault containing Susdc
// 0x6eae95ee783e4d862867c4e0e4c3f4b95aa682ba Vault containing Usdc