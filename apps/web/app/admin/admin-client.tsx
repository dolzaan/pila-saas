"use client";

import { useState } from "react";
import { 
  updateUserRole, 
  updateUserPassword, 
  updateSubscriptionStatus, 
  deleteUser 
} from "@/app/actions/admin";
import { Key, CreditCard, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getUserSubscriptionStatus } from "@/lib/subscription";

const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "TRIALING",
  "PAST_DUE",
  "CANCELED",
] as const;

type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: Date | null;
  } | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function isSubscriptionStatus(
  status: string | null | undefined,
): status is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.some((candidate) => candidate === status);
}

export default function AdminClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [subPlan, setSubPlan] = useState("pro");

  const handleRoleToggle = async (userId: string, currentRole: "USER" | "ADMIN") => {
    if (!confirm(`Deseja mudar a permissão deste usuário?`)) return;
    setLoading(true);
    try {
      const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert(getErrorMessage(error));
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (userId: string) => {
    if (newPassword.length < 8) {
      alert("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await updateUserPassword(userId, newPassword);
      alert("Senha atualizada com sucesso.");
      setEditingPasswordId(null);
      setNewPassword("");
    } catch (error) {
      alert(getErrorMessage(error));
    }
    setLoading(false);
  };

  const handleSubscriptionUpdate = async (userId: string) => {
    setLoading(true);
    try {
      await updateSubscriptionStatus(userId, subStatus, subPlan);
      setUsers(users.map(u => u.id === userId ? { ...u, subscription: { status: subStatus, plan: subPlan, currentPeriodEnd: u.subscription?.currentPeriodEnd || null } } : u));
      setEditingSubId(null);
      alert("Assinatura atualizada.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
    setLoading(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza absoluta? Isso apagará TODOS os dados do usuário!")) return;
    setLoading(true);
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      alert(getErrorMessage(error));
    }
    setLoading(false);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <tr>
            <th className="px-4 py-3">Usuário</th>
            <th className="px-4 py-3">Permissão</th>
            <th className="px-4 py-3">Status da Conta</th>
            <th className="px-4 py-3">Dias Restantes</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b dark:border-gray-700">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-white">{user.name || "Sem nome"}</p>
                <p className="text-xs">{user.email}</p>
              </td>
              <td className="px-4 py-3">
                <button 
                  onClick={() => handleRoleToggle(user.id, user.role)}
                  disabled={loading}
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === "ADMIN" 
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" 
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {user.role}
                </button>
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const subData = getUserSubscriptionStatus(user.createdAt, user.subscription);
                  const isExpired = subData.status === "EXPIRED";
                  const isTrial = subData.status === "TRIALING";
                  
                  return (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      isExpired ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" :
                      isTrial ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" :
                      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    }`}>
                      {subData.status}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3 font-medium">
                {(() => {
                  const subData = getUserSubscriptionStatus(user.createdAt, user.subscription);
                  if (subData.status === "EXPIRED") return <span className="text-red-500">Expirado</span>;
                  return <span>{subData.daysLeft} dias</span>;
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {(() => {
                  const subData = getUserSubscriptionStatus(user.createdAt, user.subscription);
                  return format(new Date(subData.expiresAt), "dd/MM/yyyy");
                })()}
              </td>
              <td className="px-4 py-3 flex gap-2 justify-end">
                <button 
                  title="Alterar Senha"
                  onClick={() => setEditingPasswordId(user.id)}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button 
                  title="Gerenciar Assinatura"
                  onClick={() => {
                    setEditingSubId(user.id);
                    setSubStatus(
                      isSubscriptionStatus(user.subscription?.status)
                        ? user.subscription.status
                        : "ACTIVE",
                    );
                    setSubPlan(user.subscription?.plan || "pro");
                  }}
                  className="p-1.5 text-green-500 hover:bg-green-50 rounded"
                >
                  <CreditCard className="w-4 h-4" />
                </button>
                <button 
                  title="Excluir Usuário"
                  onClick={() => handleDelete(user.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modals/Dialogs inline for simplicity */}
      {editingPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Alterar Senha</h3>
            <input 
              type="password" 
              placeholder="Nova Senha (min 8 carac.)"
              className="w-full border p-2 rounded mb-4 bg-transparent text-gray-900 dark:text-white"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 border rounded dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700" 
                onClick={() => setEditingPasswordId(null)}
              >
                Cancelar
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => handlePasswordUpdate(editingPasswordId)}
                disabled={loading}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSubId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Gerenciar Assinatura</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Plano</label>
              <select 
                value={subPlan}
                onChange={e => setSubPlan(e.target.value)}
                className="w-full border p-2 rounded bg-transparent dark:text-white"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
              <select 
                value={subStatus}
                onChange={(event) => {
                  if (isSubscriptionStatus(event.target.value)) {
                    setSubStatus(event.target.value);
                  }
                }}
                className="w-full border p-2 rounded bg-transparent dark:text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="TRIALING">TRIALING</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 border rounded dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700" 
                onClick={() => setEditingSubId(null)}
              >
                Cancelar
              </button>
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => handleSubscriptionUpdate(editingSubId)}
                disabled={loading}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
