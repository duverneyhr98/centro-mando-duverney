import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [tareas, setTareas] = useState([]);
  const [recordatorios, setRecordatorios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [tareasRes, recRes, movRes, ideasRes] = await Promise.all([
      supabase.from("tareas").select("*"),
      supabase.from("recordatorios").select("*").eq("estado", "pendiente"),
      supabase.from("transacciones_financieras").select("*"),
      supabase.from("ideas").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    setTareas(tareasRes.data || []);
    setRecordatorios(recRes.data || []);
    setMovimientos(movRes.data || []);
    setIdeas(ideasRes.data || []);
    setLoading(false);
  }

  const formatoCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

  const pendientes = tareas.filter(t => t.estado !== "terminada");

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const proximosPagos = recordatorios.filter(r => {
    const f = new Date(r.fecha_vencimiento); f.setHours(0,0,0,0);
    const dias = (f - hoy) / (1000*60*60*24);
    return dias <= 7;
  }).sort((a,b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));

  const flujoCaja = movimientos.reduce((acc, m) => {
    const signo = m.tipo === "recaudo" ? 1 : -1;
    return acc + signo * Number(m.monto);
  }, 0);

  const gastosRecientes = movimientos
    .filter(m => m.tipo === "gasto")
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const vencidos = recordatorios.filter(r => {
    const f = new Date(r.fecha_vencimiento); f.setHours(0,0,0,0);
    return f < hoy;
  });

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  const hoyTexto = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const stats = [
    { label: "Tareas pendientes", value: pendientes.length },
    { label: "Próximos pagos", value: proximosPagos.length },
    { label: "Flujo de caja", value: formatoCOP(flujoCaja) },
    { label: "Alertas vencidas", value: vencidos.length },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="text-sm text-gray-400 capitalize mb-2">{hoyTexto}</p>
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Centro de Mando</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 pb-8 border-b border-gray-100">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-semibold text-gray-900 mb-1">{s.value}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Tareas pendientes */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Pendientes</h2>
          {pendientes.length === 0 ? (
            <p className="text-sm text-gray-400">Sin tareas pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {pendientes.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-700">{t.titulo}</span>
                  <span className="text-xs text-gray-400 capitalize">{t.estado.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Próximos pagos */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Próximos pagos</h2>
          {proximosPagos.length === 0 ? (
            <p className="text-sm text-gray-400">No tienes pagos próximos.</p>
          ) : (
            <ul className="space-y-3">
              {proximosPagos.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-700">{r.titulo}</span>
                  <span className="text-xs text-gray-400">
                    {formatoCOP(r.monto)} · {new Date(r.fecha_vencimiento).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Gastos recientes */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Gastos recientes</h2>
          {gastosRecientes.length === 0 ? (
            <p className="text-sm text-gray-400">No hay gastos registrados.</p>
          ) : (
            <ul className="space-y-3">
              {gastosRecientes.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-700">{g.descripcion || "Sin descripción"}</span>
                  <span className="text-xs text-gray-400">{formatoCOP(g.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ideas recientes */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Ideas recientes</h2>
          {ideas.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no tienes ideas guardadas.</p>
          ) : (
            <ul className="space-y-3">
              {ideas.map((idea) => (
                <li key={idea.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-700">{idea.titulo}</span>
                  <span className="text-xs text-gray-400">{idea.categoria}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}