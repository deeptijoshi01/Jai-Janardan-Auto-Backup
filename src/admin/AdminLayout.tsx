import { useEffect, useState } from "react";
import { Menu, Bell, ChevronDown, LogOut, User } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  clearAdminSession,
  logoutAdmin,
  verifyAdminSession,
} from "../services/adminAuth";
import type { AdminUser } from "../services/adminAuth";

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    verifyAdminSession()
      .then((user) => {
        if (!active) return;
        if (!user) {
          clearAdminSession();
          navigate("/admin/login", { replace: true });
          return;
        }
        setAdmin(user);
        setCheckingSession(false);
      })
      .catch((error: unknown) => {
        console.error("Admin session verification error:", error);
        if (active) {
          clearAdminSession();
          navigate("/admin/login", { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await logoutAdmin();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to sign out."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-sm text-[#6b665c]">
        Verifying admin session…
      </main>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="min-w-0 lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md md:px-8">
          
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-gray-700 transition hover:bg-gray-100 lg:hidden"
          >
            <Menu size={22} />
          </button>

          {/* Desktop Title */}
          <Link to="/admin" className="hidden lg:block">
            <p className="text-sm text-gray-500">
              Welcome back{admin?.name ? `, ${admin.name}` : ""}
            </p>

            <h2 className="text-lg font-semibold text-gray-900">
              Admin Dashboard
            </h2>
          </Link>

          {/* Right Side */}
          <div className="ml-auto flex items-center gap-3">
            
            {/* Notification */}
            <button
              type="button"
              className="relative rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100"
            >
              <Bell size={20} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* Admin Profile */}
            <div className="relative border-l border-gray-200 pl-3">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Open admin profile menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setLogoutError("");
                }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-left transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a050]"
              >
                {admin?.profileImage ? (
                  <img
                    src={admin.profileImage}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101d34] text-sm font-semibold text-[#e0b866]">
                    {admin?.name
                      ?.trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("") || <User size={18} />}
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-gray-900">
                    {admin?.name}
                  </p>
                  <p className="text-xs capitalize text-gray-500">
                    {admin?.role === "admin" ? "Administrator" : admin?.role}
                  </p>
                </div>
                <ChevronDown size={16} className="hidden text-gray-400 sm:block" />
              </button>

              {profileOpen && admin && (
                <div
                  role="menu"
                  aria-label="Admin profile"
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
                >
                  <p className="truncate font-semibold text-gray-900">{admin.name}</p>
                  <p className="mt-1 break-all text-sm text-gray-500">{admin.email}</p>
                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {admin.role === "admin" ? "Administrator" : admin.role}
                  </p>
                  {logoutError && (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                      {logoutError}
                    </p>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={() => void handleLogout()}
                    className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-xl border-t border-gray-100 pt-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut size={17} />
                    {loggingOut ? "Signing out…" : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-5rem)] min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;