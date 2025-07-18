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
      ...albumData.album,
      year: parseInt(albumData.album.year, 10),
      coverUrl: albumData.album.coverUrl
        ? `http://${config.app.host}:${config.app.port}/albums/covers/${albumData.album.coverUrl}`
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
    if (albumData.isCache) {
      response.header("X-Data-Source", "cache");
    }
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

  async postAlbumLikesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.addAlbumLike(id, credentialId);
    const response = h.response({
      status: "success",
      message: "Berhasil menyukai album",
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.deleteAlbumLike(id, credentialId);

    const response = h.response({
      status: "success",
      message: "Berhasil batal menyukai album",
    });
    response.code(200);
    return response;
  }

  async getAlbumLikesHandler(request, h) {
    const { id } = request.params;
    const result = await this._service.getAlbumLike(id);
    const response = h.response({
      status: "success",
      message: "Berhasil mengambil album",
      data: { likes: parseInt(result.countLike, 10) },
    });
    if (result.isCache) {
      response.header("X-Data-Source", "cache");
    }
    response.code(200);
    return response;
  }
}
module.exports = AlbumsHandler;
