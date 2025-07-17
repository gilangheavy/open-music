const config = require("../../utils/config");
class AlbumsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const albumId = await this._service.addAlbum({ name, year });
    const response = h.response({
      status: "success",
      message: "Album berhasil ditambahkan",
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const albumData = await this._service.getAlbumById(id);
    const songs = await this._service.getSongByAlbum(id);
    const album = {
      ...albumData,
      year: parseInt(albumData.year, 10),
      coverUrl: albumData.coverUrl
        ? `http://${config.app.host}:${config.app.port}/albums/covers/${albumData.coverUrl}`
        : albumData.coverUrl,
      songs: songs,
    };

    const response = h.response({
      status: "success",
      message: "Berhasil mengambil data album",
      data: {
        album,
      },
    });
    response.code(200);
    return response;
  }

  async putAlbumByIdHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;
    await this._service.editAlbumById(id, request.payload);
    const response = h.response({
      status: "success",
      message: "Album berhasil diperbarui",
      data: {},
    });
    response.code(200);
    return response;
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id, request.payload);
    const response = h.response({
      status: "success",
      message: "Album berhasil dihapus",
      data: {},
    });
    response.code(200);
    return response;
  }

  async postUploadCoverHandler(request, h) {
    const { id } = request.params;
    const { cover } = request.payload;
    this._validator.validateCoverHeaders(cover.hapi.headers);
    await this._service.addAlbumCover(id, cover, cover.hapi);
    const response = h.response({
      status: "success",
      message: "Sampul berhasil diunggah",
    });
    response.code(201);
    return response;
  }
}
module.exports = AlbumsHandler;
