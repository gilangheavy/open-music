const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");
const AuthorizationError = require("../exceptions/AuthorizationError");

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
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
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT p.id, p.name, u.username 
      FROM playlists AS p 
      JOIN users AS u ON p.owner = u.id 
      LEFT JOIN collaborations ON collaborations.playlist_id = p.id
      WHERE p.owner = $1 OR collaborations.user_id = $1`,
      // text: "SELECT p.id, p.name, u.username FROM playlists AS p JOIN users AS u ON p.owner = u.id WHERE p.owner = $1",
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: "DELETE FROM playlists WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Playlist gagal dihapus. Id tidak ditemukan");
    }
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

  async addSongToPlaylist(playlistId, { songId }) {
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
        return result.rows[0].id;
      }
    }
  }

  async getSongByPlaylistId(playlistId) {
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
    return playlist;
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
}

module.exports = PlaylistsService;
