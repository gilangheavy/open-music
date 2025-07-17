const routes = (handler) => [
  {
    method: "POST",
    path: "/collaborations",
    handler: (request, h) => handler.postCollaborationHandler(request, h),
    options: {
      auth: "token",
    },
  },
  {
    method: "DELETE",
    path: "/collaborations",
    handler: (request, h) => handler.deleteCollaborationHandler(request, h),
    options: {
      auth: "token",
    },
  },
];

module.exports = routes;
