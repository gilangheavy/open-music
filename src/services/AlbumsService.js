const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const { mapAlbumToAlbumModel } = require("../utils");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");

class AlbumsService {
  constructor(storageService, cacheService) {
    this._pool = new Pool();
    this._storageService = storageService;
    this._cacheService = cacheService;
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
    await this._cacheService.delete(`album:${id}`);
    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const result = await this._cacheService.get(`album:${id}`);
    if (result === null) {
      const query = {
        text: "SELECT * FROM albums WHERE id = $1",
        values: [id],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError("Album tidak ditemukan");
      }
      await this._cacheService.set(
        `album:${id}`,
        JSON.stringify(result.rows.map(mapAlbumToAlbumModel)[0])
      );
      return {
        album: result.rows.map(mapAlbumToAlbumModel)[0],
        isCache: false,
      };
    } else {
      const cacheAlbum = JSON.parse(result);
      return { album: cacheAlbum, isCache: true };
    }
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
    await this._cacheService.delete(`album:${id}`);
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
    await this._cacheService.delete(`album:${id}`);
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
    await this._cacheService.delete(`album:${albumId}`);
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
    await this._cacheService.delete(`countlike:${albumId}`);
    return result.rows[0].id;
  }

  async getAlbumLike(albumId) {
    const result = await this._cacheService.get(`countlike:${albumId}`);
    if (result === null) {
      const query = {
        text: "SELECT COUNT(*) AS likes FROM album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError("Album tidak ditemukan");
      }
      await this._cacheService.set(
        `countlike:${albumId}`,
        JSON.stringify(result.rows[0])
      );
      return { countLike: result.rows[0].likes, isCache: false };
    } else {
      const cacheLikes = JSON.parse(result);
      return { countLike: cacheLikes.likes, isCache: true };
    }
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
    await this._cacheService.delete(`countlike:${albumId}`);
  }
}

module.exports = AlbumsService;
