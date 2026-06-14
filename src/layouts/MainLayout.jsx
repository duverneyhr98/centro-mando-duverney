import { useState } from "react";
import CapturaRapida from "../components/CapturaRapida";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Lightbulb, CheckSquare, Calendar, Bell,
  Wallet, Repeat, FileWarning, Package, Truck,
  FolderOpen, Target, Bot, Settings, Building2, Menu, X
} from "lucide-react";

const sections = [
  {
    title: null,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Planificación",
    items: [
      { to: "/bandeja", label: "Bandeja", icon: Inbox },
      { to: "/ideas", label: "Ideas", icon: Lightbulb },
      { to: "/tareas", label: "Tareas", icon: CheckSquare },
      { to: "/calendario", label: "Calendario", icon: Calendar },
      { to: "/recordatorios", label: "Recordatorios", icon: Bell },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { to: "/finanzas", label: "Finanzas", icon: Wallet },
      { to: "/cruce-cuentas", label: "Cruce de Cuentas", icon: Repeat },
      { to: "/deudas", label: "Deudas", icon: FileWarning },
    ],
  },
  {
    title: "Operación",
    items: [
      { to: "/negocios", label: "Mis Negocios", icon: Building2 },
      { to: "/inventario", label: "Inventario", icon: Package },
      { to: "/proveedores", label: "Proveedores", icon: Truck },
      { to: "/documentos", label: "Documentos", icon: FolderOpen },
    ],
  },
  {
    title: "Otros",
    items: [
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/asistente", label: "Asistente IA", icon: Bot },
      { to: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export default function MainLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white relative">
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-30 w-64 h-full bg-[#fafafa] border-r border-gray-100 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
              D
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">Centro de Mando</p>
              <p className="text-xs text-gray-400 leading-tight">Duverney</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-gray-400">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="px-3 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition relative ${
                        isActive
                          ? "bg-white text-gray-900 font-medium shadow-sm"
                          : "text-gray-500 hover:bg-white/60 hover:text-gray-800"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-gray-900 rounded-full" />
                        )}
                        <Icon size={16} strokeWidth={1.8} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Centro de Mando v1.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-white w-full">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button onClick={() => setOpen(true)} className="text-gray-600">
            <Menu size={20} />
          </button>
          <p className="text-sm font-semibold text-gray-900">Centro de Mando</p>
        </div>

        <div className="p-4 md:p-10">
          <Outlet />
        </div>
      </main>

      <CapturaRapida />
    </div>
  );
}