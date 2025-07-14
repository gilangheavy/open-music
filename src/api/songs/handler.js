class SongsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
  }

  async postSongHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const songId = await this._service.addSong(request.payload);
    const response = h.response({
      status: "success",
      message: "Lagu berhasil ditambahkan",
      data: {
        songId,
      },
    });
    response.code(201);
    return response;
  }

  async getSongHandler(request, h) {
    const songs = await this._service.getSong();
    const response = h.response({
      status: "success",
      message: "Sukses mengambil data lagu",
      data: {
        songs,
      },
    });
    response.code(200);
    return response;
  }

  async getSongByIdHandler(request, h) {
    const { id } = request.params;
    const songData = await this._service.getSongById(id);
    const song = {
      ...songData,
      year: parseInt(songData.year, 10),
      duration: parseInt(songData.duration, 10),
    };
    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data lagu",
      data: {
        song,
      },
    });
    response.code(200);
    return response;
  }

  async putSongByIdHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const { id } = request.params;
    await this._service.editSongById(id, request.payload);
    const response = h.response({
      status: "success",
      message: "Lagu berhasil diperbarui",
    });
    response.code(200);
    return response;
  }

  async deleteSongByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteSongById(id, request.payload);
    const response = h.response({
      status: "success",
      message: "Lagu berhasil dihapus",
    });
    response.code(200);
    return response;
  }
}
module.exports = SongsHandler;
