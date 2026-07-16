import { getUsers } from "@/app/actions/admin";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const users = await getUsers();
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Gestão de Usuários</h2>
        <AdminClient initialUsers={users} />
      </div>
    </div>
  );
}
