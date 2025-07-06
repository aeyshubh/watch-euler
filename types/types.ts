export interface AccountInfo {
    account: string;
    vault: string;
}

export interface tokenInfo{
    symbol: string;
    decimals: number;
}

export interface TrackingActiveAccount {
    blockNumber: string;
    blockTimestamp: string;
    borrows: string[];
    deposits: string[];
    id: string;
    mainAddress: string;
    transactionHash: string;
}

export interface GraphQLResponse {
    trackingActiveAccounts: TrackingActiveAccount[];
}

export interface LiquidityInfo {
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

export interface VaultAccountInfo {
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

export interface AccountInfoResponse {
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
