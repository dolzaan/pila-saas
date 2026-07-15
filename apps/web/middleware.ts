import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Middleware de proteção de rotas usando Auth.js v5.
 * - /dashboard/* → exige autenticação
 * - /login, /register → redireciona para /dashboard se já autenticado
 * - / → redireciona baseado no estado de auth
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;

  // Rotas protegidas: /dashboard e subpáginas
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Rotas de auth: redireciona para /dashboard se já logado
  if (
    isAuthenticated &&
    (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rota raiz: redireciona baseado no estado de auth
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
