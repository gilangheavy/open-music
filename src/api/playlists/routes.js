const routes = (handler) => [
  {
    method: "POST",
    path: "/playlists",
    handler: (request, h) => handler.postPlaylistHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "GET",
    path: "/playlists",
    handler: (request, h) => handler.getPlaylistsHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "DELETE",
    path: "/playlists/{id}",
    handler: (request, h) => handler.deletePlaylistByIdHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "POST",
    path: "/playlists/{id}/songs",
    handler: (request, h) => handler.postPlaylistSongsHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "GET",
    path: "/playlists/{id}/songs",
    handler: (request, h) => handler.getPlaylistSongsHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "DELETE",
    path: "/playlists/{id}/songs",
    handler: (request, h) => handler.deletePlaylistSongsHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "GET",
    path: "/playlists/{id}/activities",
    handler: (request, h) => handler.getLogActivity(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "POST",
    path: "/export/playlists/{playlistId}",
    handler: (request, h) => handler.postExportPlaylistHandler(request, h),
    options: {
      auth: "token",
    },
  },
];

module.exports = routes;
