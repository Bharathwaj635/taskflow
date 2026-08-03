/**
 * Include on every page that requires a logged-in user.
 * (Real enforcement happens server-side via @jwt_required(); this is
 * just to avoid flashing protected content before redirecting.)
 */
(function () {
  const publicPaths = ["/login", "/register"];
  const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
  if (!localStorage.getItem("token") && !isPublic) {
    window.location.href = "/login";
  }
})();
