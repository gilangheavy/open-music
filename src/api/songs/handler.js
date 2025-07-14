class SongsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
  }

  async postSongHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const { title = "untitled", body, tags } = request.payload;
    const songId = await this._service.addSong({ title, body, tags });
    const response = h.response({
      status: "success",
      message: "Song berhasil ditambahkan",
      data: {
        songId,
      },
    });
    response.code(201);
    return response;
  }
}
module.exports = SongsHandler;
