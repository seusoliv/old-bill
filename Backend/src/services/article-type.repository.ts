import {getDb} from "./database.service";
import {ArticleType} from "../../../src/app/services/storage/interfaces/article-type";

function mapRow(row: any): ArticleType {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    prize: row.prize,
    additionalInformation: row.additionalInformation ?? undefined,
    articleNumber: row.articleNumber,
    isFlexPrice: !!row.isFlexPrice,
    isNegativePosition: !!row.isNegativePosition,
  };
}

export class ArticleTypeRepository {
  static getAll(): ArticleType[] {
    return getDb().prepare("SELECT * FROM articleTypes").all().map(mapRow);
  }

  static get(id: number): ArticleType | undefined {
    const row = getDb().prepare("SELECT * FROM articleTypes WHERE id = ?").get(id);
    return row ? mapRow(row) : undefined;
  }

  static getByNumber(articleNumber: string): ArticleType | undefined {
    const row = getDb().prepare("SELECT * FROM articleTypes WHERE articleNumber = ? LIMIT 1").get(articleNumber);
    return row ? mapRow(row) : undefined;
  }

  static find(
    search: string,
    start: number,
    end: number,
    opts: {unit?: string; isNegativePosition?: boolean} = {},
  ): ArticleType[] {
    const limit = end;
    const offset = Math.max(0, start - 1);
    const where: string[] = [];
    const params: unknown[] = [];
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      where.push("(lower(name) LIKE ? OR lower(articleNumber) LIKE ?)");
      params.push(like, like);
    }
    if (opts.unit) {
      where.push("unit = ?");
      params.push(opts.unit);
    }
    if (opts.isNegativePosition != null) {
      where.push("isNegativePosition = ?");
      params.push(opts.isNegativePosition ? 1 : 0);
    }
    let sql = "SELECT * FROM articleTypes";
    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);
    return getDb().prepare(sql).all(...params).map(mapRow);
  }

  static add(articleType: ArticleType): number {
    const info = getDb().prepare(
      "INSERT INTO articleTypes (name, unit, prize, additionalInformation, articleNumber, isFlexPrice, isNegativePosition) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(articleType.name, articleType.unit, articleType.prize, articleType.additionalInformation ?? null,
        articleType.articleNumber, articleType.isFlexPrice ? 1 : 0, articleType.isNegativePosition ? 1 : 0);
    return Number(info.lastInsertRowid);
  }

  static put(articleType: ArticleType): number {
    if (articleType.id == null) {
      return this.add(articleType);
    }
    getDb().prepare(
      "INSERT INTO articleTypes (id, name, unit, prize, additionalInformation, articleNumber, isFlexPrice, isNegativePosition) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET name=excluded.name, unit=excluded.unit, prize=excluded.prize, " +
      "additionalInformation=excluded.additionalInformation, articleNumber=excluded.articleNumber, " +
      "isFlexPrice=excluded.isFlexPrice, isNegativePosition=excluded.isNegativePosition")
      .run(articleType.id, articleType.name, articleType.unit, articleType.prize,
        articleType.additionalInformation ?? null, articleType.articleNumber,
        articleType.isFlexPrice ? 1 : 0, articleType.isNegativePosition ? 1 : 0);
    return articleType.id;
  }

  static delete(id: number): void {
    getDb().prepare("DELETE FROM articleTypes WHERE id = ?").run(id);
  }

  static clear(): void {
    getDb().prepare("DELETE FROM articleTypes").run();
  }
}
