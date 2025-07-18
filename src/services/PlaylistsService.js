const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");
const AuthorizationError = require("../exceptions/AuthorizationError");

class PlaylistsService {
  constructor(collaborationService, cacheService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO playlists VALUES($1, $2, $3) RETURNING id",
      values: [id, name, owner],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError("Playlist gagal ditambahkan");
    }
    await this._cacheService.delete(`playlists:${owner}`);
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const playlistCache = await this._cacheService.get(`playlists:${owner}`);
    if (playlistCache === null) {
      const query = {
        text: `SELECT p.id, p.name, u.username 
      FROM playlists AS p 
      JOIN users AS u ON p.owner = u.id 
      LEFT JOIN collaborations ON collaborations.playlist_id = p.id
      WHERE p.owner = $1 OR collaborations.user_id = $1`,
        values: [owner],
      };
      const result = await this._pool.query(query);
      await this._cacheService.set(
        `playlists:${owner}`,
        JSON.stringify(result.rows)
      );
      return { playlist: result.rows, isCache: false };
    } else {
      const cachePlaylist = JSON.parse(playlistCache);
      return { playlist: cachePlaylist, isCache: true };
    }
  }

  async getPlaylistById(id) {
    const query = {
      text: `SELECT * FROM playlists WHERE id = $1`,
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }
    return result.rows[0];
  }

  async deletePlaylistById(id) {
    const playlist = await this.getPlaylistById(id);
    await this._cacheService.delete(`playlists:${playlist.owner}`);
    const query = {
      text: "DELETE FROM playlists WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Playlist gagal dihapus. Id tidak ditemukan");
    }
  }

  async addPlaylistSongToPlaylist(playlistId, { songId }) {
    const id = `playlistsong-${nanoid(16)}`;
    const querySong = {
      text: "SELECT * FROM songs WHERE id = $1",
      values: [songId],
    };
    const resultSong = await this._pool.query(querySong);

    if (!resultSong.rows.length) {
      throw new NotFoundError("Data lagu tidak ditemukan");
    } else {
      const queryPlaylistSong = {
        text: "SELECT * FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2",
        values: [playlistId, songId],
      };
      const resultPlaylistSong = await this._pool.query(queryPlaylistSong);
      if (resultPlaylistSong.rows.length) {
        throw new InvariantError("Data lagu sudah ada di playlist");
      } else {
        const query = {
          text: "INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id",
          values: [id, playlistId, songId],
        };
        const result = await this._pool.query(query);
        if (!result.rows.length) {
          throw new InvariantError("Lagu gagal ditambahkan ke playlist");
        }
        await this._cacheService.delete(`playlist-songs:${playlistId}`);
        return result.rows[0].id;
      }
    }
  }

  async getPlaylistSongByPlaylistId(playlistId) {
    const playlistSongCache = await this._cacheService.get(
      `playlist-songs::${playlistId}`
    );
    if (playlistSongCache === null) {
      const queryPlaylist = {
        text: "SELECT p.id, p.name, u.username FROM playlists AS p JOIN users AS u ON p.owner = u.id WHERE p.id = $1",
        values: [playlistId],
      };
      const resultPlaylist = await this._pool.query(queryPlaylist);
      const playlistResult = resultPlaylist.rows[0];

      const querySong = {
        text: "SELECT s.id,title,performer FROM songs s JOIN playlistsongs ps ON s.id = ps.song_id  WHERE ps.playlist_id = $1",
        values: [playlistId],
      };
      const resultSong = await this._pool.query(querySong);
      const songResult = resultSong.rows;

      const playlist = {
        ...playlistResult,
        songs: songResult,
      };
      await this._cacheService.set(
        `playlist-songs:${playlistId}`,
        JSON.stringify(playlist)
      );
      return { playlistSong: playlist, isCache: false };
    } else {
      const cachePlaylistSong = JSON.parse(playlistSongCache);
      return { playlistSong: cachePlaylistSong, isCache: true };
    }
  }

  async deletePlaylistSongBySongId(playlistId, { songId }) {
    const querySong = {
      text: "SELECT * FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2",
      values: [playlistId, songId],
    };
    const resultSong = await this._pool.query(querySong);
    if (!resultSong.rows.length) {
      throw new NotFoundError("Data lagu tidak ditemukan");
    }

    const query = {
      text: "DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id",
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(
        "Lagu dalam playlist gagal dihapus. Id tidak ditemukan"
      );
    }
    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async addLogActivity({ playlistId, songId, userId, action }) {
    const id = `log-${nanoid(16)}`;
    const timestamp = new Date().toISOString();
    const query = {
      text: "INSERT INTO playlistsong_activities VALUES($1, $2, $3, $4, $5, $6) RETURNING id",
      values: [id, playlistId, songId, userId, action, timestamp],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError("Log gagal ditambahkan");
    }
    return result.rows[0].id;
  }

  async getLogActivity(playlistId, { userId }) {
    const query = {
      text: `SELECT s.title, u.username, a.action, a.time 
      FROM playlistsong_activities AS a 
      JOIN songs AS s ON a.song_id = s.id
      JOIN users AS u ON a.user_id = u.id
      WHERE a.playlist_id = $1 AND a.user_id = $2`,
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: "SELECT * FROM playlists WHERE id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }
    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini");
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async verifyPlaylistActivityOwner(id, owner) {
    const query = {
      text: "SELECT * FROM playlistsong_activities WHERE playlist_id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }
    const playlistActivity = result.rows[0];
    if (playlistActivity.user_id !== owner) {
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini");
    }
  }
}

module.exports = PlaylistsService;
