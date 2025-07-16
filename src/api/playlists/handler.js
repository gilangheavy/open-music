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
    const playlists = await this._service.getPlaylists(credentialId);

    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data playlist",
      data: {
        playlists,
      },
    });
    response.code(201);
    return response;
  }
  async deletePlaylistByIdHandler() {}
  async postPlaylistSongsHandler() {}
  async getPlaylistSongsHandler() {}
  async deletePlaylistSongsHandler() {}
}

module.exports = PlaylistsHandler;
