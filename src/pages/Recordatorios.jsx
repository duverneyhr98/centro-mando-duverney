import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Bell } from "lucide-react";

const CATEGORIAS = ["Banco", "Crédito", "Servicio", "Arriendo", "Nómina", "Proveedor", "Impuesto", "Otro"];
const FRECUENCIAS = ["Única vez", "Semanal", "Mensual", "Anual"];

export default function Recordatorios() {
  const [recordatorios, setRecordatorios] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [frecuencia, setFrecuencia] = useState(FRECUENCIAS[0]);
  const [negocioId, setNegocioId] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [notifPermiso, setNotifPermiso] = useState("default");

  const notifDisponible = typeof window !== "undefined" && "Notification" in window;

  useEffect(() => {
    if (notifDisponible) {
      setNotifPermiso(Notification.permission);
    }
    fetchRecordatorios();
    fetchNegocios();
  }, []);

  useEffect(() => {
    if (recordatorios.length > 0 && notifDisponible && notifPermiso === "granted") {
      verificarAlertas(recordatorios);
    }
  }, [recordatorios]);

  function verificarAlertas(lista) {
    if (!notifDisponible) return;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    lista.filter(r => r.estado === "pendiente").forEach(r => {
      const f = new Date(r.fecha_vencimiento);
      f.setHours(0, 0, 0, 0);
      const dias = Math.round((f - hoy) / (1000 * 60 * 60 * 24));
      if (dias < 0) {
        new Notification("Recordatorio vencido", { body: `"${r.titulo}" venció hace ${Math.abs(dias)} día(s)` });
      } else if (dias === 0) {
        new Notification("Vence HOY", { body: `"${r.titulo}" vence hoy` });
      } else if (dias <= 3) {
        new Notification("Próximo a vencer", { body: `"${r.titulo}" vence en ${dias} día(s)` });
      }
    });
  }

  async function activarNotificaciones() {
    if (!notifDisponible) {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    const permiso = await Notification.requestPermission();
    setNotifPermiso(permiso);
    if (permiso === "granted") {
      new Notification("Notificaciones activadas", { body: "Centro de Mando te avisará cuando algo venza." });
    }
  }

  async function fetchRecordatorios() {
    setLoading(true);
    const { data, error } = await supabase
      .from("recordatorios")
      .select("*, negocios(nombre)")
      .order("fecha_vencimiento", { ascending: true });
    if (!error) setRecordatorios(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarRecordatorio() {
    if (!titulo.trim() || !fecha || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("recordatorios").insert([{
      titulo, categoria,
      monto: monto ? parseFloat(monto) : null,
      fecha_vencimiento: fecha, frecuencia,
      negocio_id: negocioId || null,
      estado: "pendiente",
    }]);
    if (!error) { setTitulo(""); setMonto(""); setFecha(""); fetchRecordatorios(); }
    setEnviando(false);
  }

  async function marcarPagado(r) {
    await supabase.from("recordatorios").update({ estado: "pagado" }).eq("id", r.id);
    if (r.frecuencia && r.frecuencia !== "Única vez" && r.fecha_vencimiento) {
      const partes = r.fecha_vencimiento.split("-");
      let year = parseInt(partes[0], 10);
      let month = parseInt(partes[1], 10);
      let day = parseInt(partes[2], 10);
      if (r.frecuencia === "Semanal") {
        const fechaBase = new Date(year, month - 1, day);
        fechaBase.setDate(fechaBase.getDate() + 7);
        year = fechaBase.getFullYear(); month = fechaBase.getMonth() + 1; day = fechaBase.getDate();
      } else if (r.frecuencia === "Mensual") {
        month += 1;
        if (month > 12) { month = 1; year += 1; }
        const ultimoDia = new Date(year, month, 0).getDate();
        if (day > ultimoDia) day = ultimoDia;
      } else if (r.frecuencia === "Anual") { year += 1; }
      const pad = (n) => String(n).padStart(2, "0");
      await supabase.from("recordatorios").insert([{
        titulo: r.titulo, categoria: r.categoria, monto: r.monto,
        fecha_vencimiento: `${year}-${pad(month)}-${pad(day)}`,
        frecuencia: r.frecuencia, negocio_id: r.negocio_id, estado: "pendiente",
      }]);
    }
    fetchRecordatorios();
  }

  async function eliminarRecordatorio(id) {
    await supabase.from("recordatorios").delete().eq("id", id);
    fetchRecordatorios();
  }

  const formatoCOP = (n) =>
    n ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n) : "-";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  function estadoVencimiento(fechaStr) {
    const f = new Date(fechaStr);
    f.setHours(0, 0, 0, 0);
    const dias = Math.round((f - hoy) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: "Vencido", color: "bg-red-100 text-red-700" };
    if (dias === 0) return { texto: "Hoy", color: "bg-orange-100 text-orange-700" };
    if (dias <= 3) return { texto: `En ${dias} día(s)`, color: "bg-yellow-100 text-yellow-700" };
    return { texto: `En ${dias} días`, color: "bg-gray-100 text-gray-600" };
  }

  const pendientes = recordatorios.filter(r => r.estado === "pendiente");
  const pagados = recordatorios.filter(r => r.estado === "pagado");

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Recordatorios</h1>
        {notifDisponible && (
          notifPermiso === "granted" ? (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-3 py-1 rounded-full">
              <Bell size={14} /> Notificaciones activas
            </div>
          ) : (
            <button onClick={activarNotificaciones} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
              <Bell size={14} /> Activar alertas
            </button>
          )
        )}
      </div>
      <p className="text-gray-500 mb-6">Bancos, créditos, proveedores y pagos personales</p>

      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="¿Qué debes recordar?" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded-lg px-3 py-2 flex-1" />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="border rounded-lg px-3 py-2">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="number" placeholder="Monto (opcional)" value={monto} onChange={(e) => setMonto(e.target.value)} className="border rounded-lg px-3 py-2 w-40" />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="border rounded-lg px-3 py-2" />
          <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className="border rounded-lg px-3 py-2">
            {FRECUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Personal (sin negocio)</option>
            {negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
          <button onClick={agregarRecordatorio} disabled={enviando} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 ml-auto">
            Agregar
          </button>
        </div>
      </div>

      <h2 className="font-semibold text-gray-700 mb-2">Pendientes</h2>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">No tienes recordatorios pendientes.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {pendientes.map((r) => {
            const v = estadoVencimiento(r.fecha_vencimiento);
            return (
              <div key={r.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${v.color}`}>{v.texto}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{r.categoria}</span>
                    {r.negocios && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{r.negocios.nombre}</span>}
                  </div>
                  <p className="font-medium text-gray-800">{r.titulo}</p>
                  <p className="text-sm text-gray-500">Vence: {new Date(r.fecha_vencimiento).toLocaleDateString("es-CO")} · {formatoCOP(r.monto)} · {r.frecuencia}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => marcarPagado(r)} className="text-sm text-green-600 hover:underline">Marcar pagado</button>
                  <button onClick={() => eliminarRecordatorio(r.id)} className="text-sm text-red-500 hover:underline">Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagados.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mb-2">Pagados</h2>
          <div className="space-y-2">
            {pagados.map((r) => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-2 opacity-60">
                <div>
                  <p className="font-medium text-gray-600 line-through">{r.titulo}</p>
                  <p className="text-sm text-gray-400">{formatoCOP(r.monto)} · {r.categoria}</p>
                </div>
                <button onClick={() => eliminarRecordatorio(r.id)} className="text-sm text-red-500 hover:underline">Eliminar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}