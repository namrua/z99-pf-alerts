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

    GET_TOP_70_FIRST_BUYER: `WITH UsersWithMixedActions AS (
                SELECT 
                    userId, 
                    blockNumber 
                FROM BCE.Trading 
                WHERE mintId = '{mintId}'
                GROUP BY userId, blockNumber 
                HAVING COUNT(DISTINCT isBuy) > 1
            ),

            RankedTrades AS (
                SELECT 
                    t.userId AS userId, 
                    t.mintId AS mintId,
                    t.blockNumber AS blockNumber, 
                    tp.blockNumber AS tpBlockNumber,
                    groupArray(t.offsetNumber) AS offsetNumbers,
                    min(t.offsetNumber) AS minOffset
                FROM BCE.Trading t 
                LEFT JOIN UsersWithMixedActions uma 
                    ON t.userId = uma.userId 
                    AND t.blockNumber = uma.blockNumber 
                JOIN TokenPairs tp 
                    ON t.mintId = tp.mintId 
                WHERE 
                    (uma.userId = '' OR uma.userId IS NULL) 
                    AND t.isBuy = 1 
                    AND mintId = '{mintId}'
                    AND tp.type IN ('pump', 'moonshot')
                    AND t.userId != '{deployerId}'
                GROUP BY t.userId, t.mintId, t.blockNumber, tp.blockNumber
            ),

            FinalTrades AS (
                SELECT 
                    userId, 
                    mintId, 
                    blockNumber, 
                    tpBlockNumber,
                    arrayJoin(offsetNumbers) AS offsetNumber,
                    arraySort(offsetNumbers) AS sortedOffsets,
                    indexOf(sortedOffsets, offsetNumber) AS currentIndex,
                    if(currentIndex > 1, sortedOffsets[currentIndex - 1], NULL) AS prevOffset,
                    minOffset
                FROM RankedTrades
            ),

            SniperBundleUsers AS (
                SELECT 
                    userId, 
                    mintId, 
                    offsetNumber, 
                    blockNumber, 
                    tpBlockNumber,
                    CASE 
                        WHEN blockNumber = tpBlockNumber 
                            AND (offsetNumber = minOffset OR offsetNumber = prevOffset + 1) 
                        THEN 2 
                        WHEN (blockNumber - tpBlockNumber) <= 3 
                        THEN 1 
                        ELSE 0 
                    END AS tradeType 
                FROM FinalTrades
                ORDER BY blockNumber, offsetNumber
                LIMIT 80
            ),

            BuySellInfo AS (
                SELECT 
                    t.userId,
                    t.mintId,
                    SUM(CASE WHEN t.isBuy = 1 THEN t.tokenAmount ELSE 0 END) AS totalBuy, 
                    argMin(solAmount, blockNumber) AS totalSolBought, 
                    SUM(CASE WHEN t.isBuy = 0 THEN t.tokenAmount ELSE 0 END) AS totalSell 
                FROM Trading t 
                JOIN SniperBundleUsers sbu 
                    ON t.userId = sbu.userId
                WHERE mintId = '{mintId}'
                GROUP BY t.userId, t.mintId
            )

            SELECT 
                sbu.userId,
                sbu.mintId,
                sbu.tradeType,
                bsi.totalBuy,
                bsi.totalSolBought,
                bsi.totalSell
            FROM SniperBundleUsers sbu 
            JOIN BuySellInfo bsi 
                ON sbu.userId = bsi.userId;`,

    COUNT_USER_ROLES: `SELECT 
                ur.type AS userType, 
                COUNT(DISTINCT t.userId) AS userCount
            FROM BCE.Trading t 
            LEFT JOIN BCE.UserRoles ur 
                ON ur.userId = t.userId 
            WHERE 
                t.mintId = '{mintId}'
                AND t.platformType IN (0, 1, 2) 
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
    
    GET_DEPLOYER_HISTORY: `WITH 
    (SELECT DISTINCT deployerId FROM TokenInfo WHERE mintId = '{mintId}') AS targetDeployerId
        SELECT COUNT( DISTINCT ti.mintId) AS made
        FROM TokenInfo ti 
        WHERE deployerId = targetDeployerId`,

    GET_TOKEN_BY_DEV: `WITH 
    (SELECT DISTINCT deployerId FROM TokenInfo WHERE mintId = '{mintId}') AS targetDeployerId
        SELECT ti.mintId, tp.type
        FROM TokenInfo ti 
        JOIN TokenPairs tp ON ti.mintId = tp.mintId
        WHERE deployerId = targetDeployerId
        ORDER BY ti.createdDate DESC 
        LIMIT 30`,

    GET_TOKEN_PRICE: `SELECT t.tokenPrice FROM Trading t 
        WHERE t.mintId = '{mintId}'
        ORDER BY t.createdDate DESC 
        LIMIT 1`
}