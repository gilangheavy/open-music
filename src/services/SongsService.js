const { Pool } = require("pg");
const { nanoid } = require("nanoid");
// const { mapDBToModel } = require("../../utils");
const InvariantError = require("../exceptions/InvariantError");
// const NotFoundError = require("../exceptions/NotFoundError");

class SongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({ title, body, tags }) {
    const id = "song-" + nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: "INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6) RETURNING id",
      values: [id, title, body, tags, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Song gagal ditambahkan");
    }

    return result.rows[0].id;
  }
}

exports.module = SongsService;
