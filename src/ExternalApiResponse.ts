export interface MevxTopHolder {
    holders: HolderDetail[];
    totalSize: number;
}

export interface HolderDetail {
    wallet: string;
    amount: string;
}

export interface WallentBalance {
    mint: string;
    raw_value: string;
    usd_value: number;
}

export interface BotInfo {
    count: number;
    sum: number;
}

export interface DexscreenerSecurity {
    dexPaid: boolean;
    cto: boolean;
}

export interface DexscreenerUpdatedData {
    url: string;
    chainId: string;
    tokenAddress: string;
    totalAmount: string;
    amount: string;
}

export interface UrlInfo {
    symbol: string;
    image: string;
    image2: string;
    name: string;
    website: string;
    telegram: string;
    twitter: string;
    discord: string;
    description: string;
}

export interface MevxTokenMetaData {
    symbol: string;
    name: string;
    urlInfo: UrlInfo;
    address: string;
    tokenPrice: number;
    tokenPriceUsd: number;
    totalSupply: number;
    exchange: string;
    factory: string;
    usdPool: number;
    tokenDecimal: number;
    totalbase: number;
    totalquote: number;
    solPrice: number;
    isFreezeable: boolean;
    isMintable: boolean;
    burnPercent: number;
    owner: string;
    createTime: number;
    isListed: boolean;
    startTime: number;
    addLiquid: boolean;
    pairAddress: string;
    realTokenReserves: number;
    initialRealTokenReserves: number;
}
