const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../exceptions/InvariantError");
const NotFoundError = require("../exceptions/NotFoundError");
const AuthorizationError = require("../exceptions/AuthorizationError");

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
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
      // text: `SELECT playlists.* FROM notes LEFT JOIN collaborations ON collaborations.note_id = notes.id WHERE notes.owner = $1 OR collaborations.user_id = $1 GROUP BY notes.id`,
      text: "SELECT p.id, p.name, u.username FROM playlists AS p JOIN users AS u ON p.owner = u.id WHERE p.owner = $1",
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
    const note = result.rows[0];
    if (note.owner !== owner) {
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini");
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

  async deletePlaylistSongBySongId(songId) {
    const querySong = {
      text: "SELECT * FROM playlistsongs WHERE song_id = $1",
      values: [songId],
    };
    const resultSong = await this._pool.query(querySong);

    if (!resultSong.rows.length) {
      throw new NotFoundError("Data lagu tidak ditemukan");
    } else {
      const query = {
        text: "DELETE FROM playlistsongs WHERE song_id = $1 RETURNING id",
        values: [songId],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError(
          "Lagu dalam playlist gagal dihapus. Id tidak ditemukan"
        );
      }
    }
  }
}

module.exports = PlaylistsService;
