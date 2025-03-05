import { createClient } from "@clickhouse/client";
import { QueryParams } from "./Queries";
import Utils from "./Utils";
const mysql = require("mysql2/promise");

export const clickhouse = createClient({
  url: 'https://zp8gub83b7.ap-southeast-1.aws.clickhouse.cloud:8443',
  username: 'default',
  password: 'e_6vg8G_DfsDz',
  database: "BCE",
  clickhouse_settings: {
    connect_timeout: 100,
  },
});

const pool = mysql.createPool({
  host: "ls-90f9fb34efb7933a63df4116b45a057ec5ab19ff.cbelxruagmls.ap-southeast-1.rds.amazonaws.com",
  user: "dbmasteruser",
  password: "|a$<=0%ZOp6Ry]o_:F(~o-1iJr3hA1nb",
  database: "tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export class ClickHouseService {
  public static async query<T>(query: string, params: QueryParams): Promise<T> {
    try {
      const formattedQuery = Utils.formatQuery(query, params);
      const rows = await clickhouse.query({
        query: formattedQuery,
        format: "JSONEachRow",
      });
      const result = await rows.json<T>();
      return result[0];
    } catch (error) {
      console.error("Query execution failed", error);
      throw error;
    }
  }

  public static async queryMany<T>(query: string, params: QueryParams): Promise<T[] | null> {
    try {
      const formattedQuery = Utils.formatQuery(query, params);
      const rows = await clickhouse.query({
        query: formattedQuery,
        format: "JSONEachRow",
      });
      const result = await rows.json<T>();
      return result;
    } catch (error) {
      console.error("Query execution failed", error);
      throw error;
    }
  }
}

export class MySQLService {
  public static async getTrackerVolume(mint: string) {
    try {
      let query = `SELECT COUNT(DISTINCT signer) as count,SUM(abs(amount)) as sum FROM tracker.Scrapper b where mint = '${mint}' and amount < 0 and date >= NOW() - INTERVAL 3 MINUTE`
      let [rows] = await pool.query(query);
      return rows[0];
    } catch (error) {
      console.error("Query vol check execution failed", error);
    }
  }
}
