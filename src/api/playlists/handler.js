class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const playlistId = await this._service.addPlaylist({
      name,
      owner: credentialId,
    });
    const response = h.response({
      status: "success",
      message: "Catatan berhasil ditambahkan",
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const playlistData = await this._service.getPlaylists(credentialId);
    const playlists = playlistData.playlist;
    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data playlist",
      data: {
        playlists,
      },
    });
    response.header("X-Data-Source", playlistData.isCache ? "cache" : "origin");
    response.code(200);
    return response;
  }

  async deletePlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(id, credentialId);
    this._service.deletePlaylistById(id);

    const response = h.response({
      status: "success",
      message: "Playlist berhasil dihapus",
    });
    response.code(200);
    return response;
  }

  async postPlaylistSongsHandler(request, h) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(id, credentialId);
    await this._service.addPlaylistSongToPlaylist(id, {
      songId,
    });
    await this._service.addLogActivity({
      playlistId: id,
      songId,
      userId: credentialId,
      action: "add",
    });
    const response = h.response({
      status: "success",
      message: "Lagu berhasil ditambahkan ke playlist",
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(id, credentialId);
    const playlistData = await this._service.getPlaylistSongByPlaylistId(id);
    const playlist = playlistData.playlistSong;
    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data lagu playlist",
      data: {
        playlist,
      },
    });
    response.header("X-Data-Source", playlistData.isCache ? "cache" : "origin");
    response.code(200);
    return response;
  }

  async deletePlaylistSongsHandler(request, h) {
    this._validator.validateDeletePlaylistSongPayload(request.payload);
    const { id } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(id, credentialId);
    await this._service.deletePlaylistSongBySongId(id, { songId });
    await this._service.addLogActivity({
      playlistId: id,
      songId,
      userId: credentialId,
      action: "delete",
    });

    const response = h.response({
      status: "success",
      message: "Lagu dalam playlist berhasil dihapus",
    });
    response.code(200);
    return response;
  }

  async getLogActivity(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistActivityOwner(id, credentialId);
    const activities = await this._service.getLogActivity(id, {
      userId: credentialId,
    });

    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data aktivitas playlist",
      data: {
        playlistId: id,
        activities,
      },
    });
    response.code(200);
    return response;
  }
}

module.exports = PlaylistsHandler;
