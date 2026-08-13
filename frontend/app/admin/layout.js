import AdminGuard from "../../components/admin/AdminGuard";
import AdminSidebar from "../../components/admin/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8">
        <AdminSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AdminGuard>
  );
}
