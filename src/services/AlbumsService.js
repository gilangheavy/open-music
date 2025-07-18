const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const { mapAlbumToAlbumModel } = require("../utils");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");

class AlbumsService {
  constructor(storageService) {
    this._pool = new Pool();
    this._storageService = storageService;
  }
  async addAlbum({ name, year }) {
    const id = "album-" + nanoid(16);

    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3) RETURNING id",
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const query = {
      text: "SELECT * FROM albums WHERE id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    return result.rows.map(mapAlbumToAlbumModel)[0];
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: "UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id",
      values: [name, year, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async getSongByAlbum(albumId) {
    const query = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [albumId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async addAlbumCover(albumId, file, meta) {
    const query = {
      text: "SELECT * FROM albums WHERE id = $1",
      values: [albumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(
        "Cover album gagal ditambahkan. Id tidak ditemukan"
      );
    }
    const coverName = await this._storageService.writeFile(file, meta);
    const oldCover = result.rows[0].cover;
    if (oldCover !== null) {
      await this._storageService.deleteFile(oldCover);
    }
    const queryUpdate = {
      text: "UPDATE albums SET cover = $1 WHERE id = $2",
      values: [coverName, albumId],
    };
    await this._pool.query(queryUpdate);
  }

  async checkAlbumLike(albumId, userId) {
    const query = {
      text: "SELECT COUNT(*) AS likes FROM album_likes WHERE album_id = $1 AND user_id = $2",
      values: [albumId, userId],
    };
    const result = await this._pool.query(query);

    return result.rows[0].likes;
  }

  async addAlbumLike(albumId, userId) {
    await this.getAlbumById(albumId);
    const albumIsLiked = await this.checkAlbumLike(albumId, userId);
    if (albumIsLiked > 0) {
      throw new InvariantError("Album sudah disukai");
    }
    const id = "albumlike-" + nanoid(16);
    const query = {
      text: "INSERT INTO album_likes VALUES($1, $2, $3)  RETURNING id",
      values: [id, userId, albumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Album like gagal ditambahkan");
    }
    return result.rows[0].id;
  }

  async getAlbumLike(albumId) {
    const query = {
      text: "SELECT COUNT(*) AS likes FROM album_likes WHERE album_id = $1",
      values: [albumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
    return result.rows[0].likes;
  }

  async deleteAlbumLike(albumId, userId) {
    const query = {
      text: "DELETE FROM album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id",
      values: [albumId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album like gagal dihapus. Id tidak ditemukan");
    }
  }
}

module.exports = AlbumsService;
