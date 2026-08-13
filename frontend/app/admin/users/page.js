"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import Spinner from "../../../components/ui/Spinner";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.getAllUsers());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRoleChange(id, role) {
    try {
      await api.updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      toast.success("Role updated");
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Users</h1>
      <p className="text-sm text-ink/50 mb-8">
        Promote a user to Admin to give them access to this panel — the Admin Panel link appears
        in their navbar the next time their profile refreshes.
      </p>

      {loading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-ink/10 text-xs uppercase tracking-widest text-ink/40">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 pr-4">{u.displayName || "—"}</td>
                <td className="py-3 pr-4">{u.email}</td>
                <td className="py-3 pr-4">
                  <select
                    value={u.role}
                    disabled={u.id === user?.uid}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="input-field w-36"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
