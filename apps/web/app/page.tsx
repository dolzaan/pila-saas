/**
 * Página raiz — o middleware em middleware.ts redireciona:
 * - Usuário autenticado → /dashboard
 * - Não autenticado → /login
 *
 * Este componente é um fallback e normalmente nunca será renderizado.
 */
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
