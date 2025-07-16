const routes = (handler) => [
  {
    method: "POST",
    path: "/collaborations",
    handler: handler.postCollaborationHandler,
    options: {
      auth: "token",
    },
  },
  {
    method: "DELETE",
    path: "/collaborations",
    handler: handler.deleteCollaborationHandler,
    options: {
      auth: "token",
    },
  },
];

module.exports = routes;
