export interface QueryParams {
    [key: string]: any;
}

export const ClickHouseQuery = {
    GET__EXTRAS_TOKEN_INFO: `
                    WITH 
                    current_mc AS
                    (
                    SELECT t.mintId, (t.poolSol / t.poolToken ) * t.solPrice * ti.totalSupply AS currentMarketCap
                    FROM Trading t 
                    JOIN TokenInfo ti ON t.mintId = ti.mintId 
                    WHERE t.mintId = '{mintId}'
                    ORDER BY t.blockNumber DESC
                    LIMIT 1
                    ),
                    first_buyer AS 
                    (
                    SELECT 
                    ti.name,
                    ti.symbol,
                    ti.deployerId,
                    ti.decimals,
                    ti.totalSupply,
                    t.mintId, (t.tokenAmount * 100 / ti.totalSupply) AS devBuy
                    FROM Trading t 
                    JOIN TokenInfo ti ON ti.mintId = t.mintId
                    WHERE t.mintId = '{mintId}'
                    ORDER BY t.blockNumber ASC
                    LIMIT 1
                    )
                    SELECT 
                    fb.name AS name,
                    fb.symbol AS symbol,
                    fb.mintId AS mintId,
                    fb.devBuy AS devBuy,
                    fb.deployerId AS deployerId,
                    fb.decimals,
                    fb.totalSupply,
                    cm.currentMarketCap AS currentMarketCap
                    FROM current_mc cm
                    JOIN first_buyer fb ON cm.mintId = fb.mintId`,
    GET_TRADING_TOKEN_INFO_BY_MINT: `
                    SELECT
                        t.mintId as mintId,
                        t.userId,
                        ti.name,
                        ti.symbol,
                        t.platformType as currentPlatformType,
                        ti.createdDate as createdDate,
                        t.solAmount,
                        t.solPrice,
                        t.tokenPrice,
                        t.tokenAmount,
                        t.poolToken,
                        t.poolSol,
                        ti.officialLinks,
                        ti.totalSupply,
                        ti.decimals,
                        from BCE.Trading t inner join BCE.TokenInfo ti on t.mintId = ti.mintId
                        where 
                        t.mintId = '{mintId}'
                        order by t.offsetNumber DESC
                        LIMIT 1`,

    GET_ATH: `SELECT 
                            t.userId,
                            t.blockNumber,
                            t.offsetNumber,
                            (t.poolSol / t.poolToken) * t.solPrice AS athTokenPrice,
                            createdDate
                        FROM 
                            BCE.Trading t
                        WHERE  t.mintId = '{mintId}'
                        AND isBuy = true
                        ORDER BY t.tokenPrice DESC 
                        LIMIT 1`,

    GET_TOP_FIRST_BUYERS: `WITH UsersWithMixedActions AS (
                SELECT 
                    wallet, 
                    blockNumber 
                FROM Z99SCAN.Trading 
                WHERE token = '{mintId}'
                GROUP BY wallet, blockNumber 
                HAVING has(groupArray(tradeType), 1) AND 
    					has(groupArray(tradeType), 2)
            ),
            
            ValidPair AS (
            	SELECT t.token, t.blockNumber FROM Z99SCAN.Trading t
            	WHERE t.token = '{mintId}' 
            	AND t.tradeType = 3
            	ORDER BY t.offsetNumber
            	LIMIT 1
            )
            
			,	
            RankedTrades AS (
                SELECT 
                    t.wallet AS wallet, 
                    t.token AS token,
                    t.blockNumber AS blockNumber, 
                    t.indexNumber,
                    vp.blockNumber AS vpBlockNumber,
                    groupArray(t.offsetNumber) AS offsetNumbers,
                    min(t.offsetNumber) AS minOffset
                FROM Z99SCAN.Trading t 
                LEFT JOIN UsersWithMixedActions uma 
                    ON t.wallet = uma.wallet 
                    AND t.blockNumber = uma.blockNumber 
                JOIN ValidPair vp 
                    ON t.token = vp.token 
                WHERE 
                    (uma.wallet = '' OR uma.wallet IS NULL) 
                    AND t.tradeType = 1 
                    AND token = '{mintId}'
                    AND t.wallet != '{deployerId}'
                GROUP BY t.wallet, t.token, t.blockNumber, vp.blockNumber, t.indexNumber
            ),

            FinalTrades AS (
                SELECT 
                    wallet, 
                    token, 
                    blockNumber, 
                    indexNumber,
                    vpBlockNumber,
                    arrayJoin(offsetNumbers) AS offsetNumber,
                    arraySort(offsetNumbers) AS sortedOffsets,
                    indexOf(sortedOffsets, offsetNumber) AS currentIndex,
                    if(currentIndex > 1, sortedOffsets[currentIndex - 1], NULL) AS prevOffset,
                    minOffset
                FROM RankedTrades
            ),

            SniperBundleUsers AS (
                SELECT 
                    wallet, 
                    token, 
                    offsetNumber, 
                    indexNumber,
                    blockNumber, 
                    vpBlockNumber
                FROM FinalTrades
                ORDER BY blockNumber, offsetNumber
                LIMIT 200
            ),

            BuySellInfo AS (
                SELECT 
                    t.wallet,
                    t.token,
                    SUM(CASE WHEN t.tradeType = 1 THEN t.tokenAmount ELSE 0 END) AS totalBuy, 
                    argMin(quoteAmount, blockNumber) AS totalQuoteBought, 
                    SUM(CASE WHEN t.tradeType = 2 THEN t.tokenAmount ELSE 0 END) AS totalSell 
                FROM Z99SCAN.Trading t 
                JOIN SniperBundleUsers sbu 
                    ON t.wallet = sbu.wallet
                WHERE token = '{mintId}'
                GROUP BY t.wallet, t.token
            )

            SELECT 
                sbu.wallet,
                sbu.token,
               	sbu.blockNumber,
               	sbu.indexNumber,
               	sbu.vpBlockNumber,
                bsi.totalBuy,
                bsi.totalQuoteBought,
                bsi.totalSell
            FROM SniperBundleUsers sbu 
            JOIN BuySellInfo bsi 
                ON sbu.wallet = bsi.wallet`,

    COUNT_USER_ROLES: `SELECT 
                ur.type AS userType, 
                COUNT(DISTINCT t.wallet) AS userCount
            FROM Z99SCAN.Trading t 
            LEFT JOIN Z99SCAN.UserRoles ur 
                ON ur.wallet = t.wallet 
            WHERE 
                t.token = '{mintId}'
                AND exchange IN ('pump')
                AND ur.type IN ('insider', 'kol')
            GROUP BY ur.type;`,

    GET_TOKEN_PAIRS: `SELECT mintId, pairId, type, blockNumber, initToken, ti.totalSupply ,initSol, offsetNumber, createdDate, deployerId, ti.symbol, ti.name FROM TokenPairs tp 
            INNER JOIN TokenInfo ti on  tp.mintId = ti.mintId
            WHERE mintId = '{input}'`,

    GET_TOTAL_PROFIT: `
    WITH 
    user_totals AS (
        SELECT 
            t.userId,
            t.isBuy,
            SUM(t.solPrice * t.solAmount) AS total
        FROM Trading t
        WHERE t.mintId = '{mintId}'
        GROUP BY t.userId, t.isBuy
    ),
    user_profit AS (
    SELECT 
        u.userId,
        SUM(CASE 
                WHEN u.isBuy = 0 THEN u.total
                WHEN u.isBuy = 1 THEN -u.total
            END) AS profit
    FROM user_totals u
    GROUP BY u.userId)
    select SUM(up.profit) as totalProfit 
    from user_profit up
    where up.profit > 0`,
    
    GET_DEPLOYER_HISTORY: `SELECT COUNT(DISTINCT token) AS made
        FROM Z99SCAN.TokenOwner 
        WHERE wallet = '{deployerId}'`,

    GET_TOKEN_BY_DEV: `WITH 
    (SELECT DISTINCT deployerId FROM TokenInfo WHERE mintId = '{mintId}') AS targetDeployerId
        SELECT ti.mintId, tp.type
        FROM TokenInfo ti 
        JOIN TokenPairs tp ON ti.mintId = tp.mintId
        WHERE deployerId = targetDeployerId
        ORDER BY ti.createdDate DESC 
        LIMIT 30`,

    GET_TOKEN_PRICE: `SELECT t.priceInUsd as tokenPrice FROM Z99SCAN.Trading t 
        WHERE t.token = '{mintId}'
        ORDER BY t.createdDate DESC 
        LIMIT 1`
}