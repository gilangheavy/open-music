const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const { mapSongToSongModel } = require("../utils");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");

class SongsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }
  async addSong({ title, year, genre, performer, duration, albumId }) {
    const id = "song-" + nanoid(16);
    const query = {
      text: "INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      values: [id, title, year, genre, performer, duration, albumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Lagu gagal ditambahkan");
    }
    await this._cacheService.delete(`song:${id}`);
    await this._cacheService.delete(`songs`);
    if (albumId) {
      await this._cacheService.delete(`songsAlbum:${albumId}`);
    }
    return result.rows[0].id;
  }

  async getSong({ title, performer }) {
    const songsCache = await this._cacheService.get(`songs`);
    if (songsCache === null) {
      let query;
      if (title && performer) {
        query = {
          text: "SELECT id, title, performer FROM songs WHERE title ~* $1 AND performer ~* $2",
          values: [title, performer],
        };
      } else if (title) {
        query = {
          text: "SELECT id, title, performer FROM songs WHERE title ~* $1 ",
          values: [title],
        };
      } else if (performer) {
        query = {
          text: "SELECT id, title, performer FROM songs WHERE performer ~* $1",
          values: [performer],
        };
      } else {
        query = { text: "SELECT id,title,performer FROM songs" };
      }

      const result = await this._pool.query(query);
      await this._cacheService.set(`songs`, JSON.stringify(result.rows));
      return result.rows;
    } else {
      const songsCacheData = JSON.parse(songsCache);
      return { songs: songsCacheData, isCache: true };
    }
  }

  async getSongById(id) {
    const songCache = await this._cacheService.get(`song:${id}`);
    if (songCache === null) {
      const query = {
        text: "SELECT * FROM songs WHERE id = $1",
        values: [id],
      };
      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError("Data lagu tidak ditemukan");
      }
      await this._cacheService.set(
        `song:${id}`,
        JSON.stringify(result.rows.map(mapSongToSongModel)[0])
      );
      return result.rows.map(mapSongToSongModel)[0];
    } else {
      const songCacheData = JSON.parse(songCache);
      return { song: songCacheData, isCache: true };
    }
  }

  async getSongByAlbum(albumId) {
    const songAlbumCache = await this._cacheService.get(
      `songsAlbum:${albumId}`
    );
    if (songAlbumCache === null) {
      const query = {
        text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      await this._cacheService.set(
        `songsAlbum:${albumId}`,
        JSON.stringify(result.rows)
      );
      return result.rows;
    } else {
      const songAlbumCacheData = JSON.parse(songAlbumCache);
      return { songs: songAlbumCacheData, isCache: true };
    }
  }

  async editSongById(id, { title, year, genre, performer, duration, albumId }) {
    const query = {
      text: "UPDATE songs SET title = $1, year = $2, genre = $3, performer = $4, duration = $5, album_id = $6 WHERE id = $7 RETURNING id",
      values: [title, year, genre, performer, duration, albumId, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui lagu. Id tidak ditemukan");
    }
    await this._cacheService.delete(`song:${id}`);
    await this._cacheService.delete(`songs`);
    if (albumId) {
      await this._cacheService.delete(`songsAlbum:${albumId}`);
    }
  }

  async deleteSongById(id) {
    const song = await this.getSongById(id);
    if (song.albumId) {
      const albumId = song.rows[0].albumId;
      await this._cacheService.delete(`songsAlbum:${albumId}`);
    }
    const query = {
      text: "DELETE FROM songs WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Lagu gagal dihapus. Id tidak ditemukan");
    }
    await this._cacheService.delete(`song:${id}`);
    await this._cacheService.delete(`songs`);
  }
}

module.exports = SongsService;
