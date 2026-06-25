import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Finanzas() {
  const [movimientos, setMovimientos] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [tipo, setTipo] = useState("recaudo");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [negocioId, setNegocioId] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [filtroNegocio, setFiltroNegocio] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    fetchMovimientos();
    fetchNegocios();
  }, []);

  async function fetchMovimientos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("transacciones_financieras")
      .select("*, negocios(nombre)")
      .order("created_at", { ascending: false });
    if (!error) setMovimientos(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarMovimiento() {
    if (!monto || !negocioId || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("transacciones_financieras").insert([{
      tipo,
      monto: parseFloat(monto),
      descripcion,
      negocio_id: negocioId,
      categoria: tipo === "recaudo" ? "Recaudo" : "Gasto",
    }]);
    if (!error) { setMonto(""); setDescripcion(""); fetchMovimientos(); }
    setEnviando(false);
  }

  async function eliminarMovimiento(id) {
    await supabase.from("transacciones_financieras").delete().eq("id", id);
    fetchMovimientos();
  }

  const formatoCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  const cajaTotal = movimientos.reduce((acc, m) => {
    return acc + (m.tipo === "recaudo" ? 1 : -1) * Number(m.monto);
  }, 0);

  const saldosPorNegocio = {};
  negocios.forEach((n) => (saldosPorNegocio[n.id] = { nombre: n.nombre, saldo: 0 }));
  movimientos.forEach((m) => {
    if (saldosPorNegocio[m.negocio_id]) {
      saldosPorNegocio[m.negocio_id].saldo += (m.tipo === "recaudo" ? 1 : -1) * Number(m.monto);
    }
  });

  const movimientosFiltrados = movimientos.filter(m => {
    const porNegocio = filtroNegocio === "todos" || m.negocio_id === filtroNegocio;
    const porTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const fecha = new Date(m.created_at);
    const porFechaDesde = !fechaDesde || fecha >= new Date(fechaDesde);
    const porFechaHasta = !fechaHasta || fecha <= new Date(fechaHasta + "T23:59:59");
    return porNegocio && porTipo && porFechaDesde && porFechaHasta;
  });

  const totalRecaudos = movimientosFiltrados.filter(m => m.tipo === "recaudo").reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgresos = movimientosFiltrados.filter(m => m.tipo === "gasto").reduce((acc, m) => acc + Number(m.monto), 0);
  const saldoFiltrado = totalRecaudos - totalEgresos;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Finanzas</h1>
      <p className="text-gray-500 mb-4">Control de caja por negocio</p>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow p-4 col-span-2 border-l-4 border-gray-800">
          <p className="text-sm text-gray-500">Caja Total</p>
          <p className="text-2xl font-bold text-gray-800">{formatoCOP(cajaTotal)}</p>
        </div>
        {Object.entries(saldosPorNegocio).map(([id, n]) => (
          <button key={id} onClick={() => setFiltroNegocio(filtroNegocio === id ? "todos" : id)}
            className={`bg-white rounded-xl shadow p-4 text-left border-2 transition ${filtroNegocio === id ? "border-blue-500" : "border-transparent"}`}>
            <p className="text-xs text-gray-500 mb-1">{n.nombre}</p>
            <p className={`text-lg font-bold ${n.saldo >= 0 ? "text-gray-800" : "text-red-600"}`}>{formatoCOP(n.saldo)}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Filtrar movimientos</p>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroNegocio("todos")} className={`px-3 py-1 rounded-full text-sm ${filtroNegocio === "todos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
            Todos
          </button>
          {negocios.map(n => (
            <button key={n.id} onClick={() => setFiltroNegocio(filtroNegocio === n.id ? "todos" : n.id)}
              className={`px-3 py-1 rounded-full text-sm ${filtroNegocio === n.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {n.nombre}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setFiltroTipo("todos")} className={`px-3 py-1 rounded-full text-sm ${filtroTipo === "todos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
            Todo
          </button>
          <button onClick={() => setFiltroTipo("recaudo")} className={`px-3 py-1 rounded-full text-sm ${filtroTipo === "recaudo" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Recaudos
          </button>
          <button onClick={() => setFiltroTipo("gasto")} className={`px-3 py-1 rounded-full text-sm ${filtroTipo === "gasto" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Egresos
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Desde</p>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Hasta</p>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
          {(fechaDesde || fechaHasta) && (
            <button onClick={() => { setFechaDesde(""); setFechaHasta(""); }} className="self-end px-3 py-2 text-sm text-gray-500 hover:text-gray-800">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resumen del filtro */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Recaudos</p>
          <p className="font-bold text-green-600 text-sm">{formatoCOP(totalRecaudos)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Egresos</p>
          <p className="font-bold text-red-500 text-sm">{formatoCOP(totalEgresos)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Saldo</p>
          <p className={`font-bold text-sm ${saldoFiltrado >= 0 ? "text-gray-800" : "text-red-600"}`}>{formatoCOP(saldoFiltrado)}</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <p className="font-semibold text-gray-700">Registrar movimiento</p>
        <div className="flex gap-2">
          <button onClick={() => setTipo("recaudo")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tipo === "recaudo" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Recaudo
          </button>
          <button onClick={() => setTipo("gasto")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tipo === "gasto" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Egreso
          </button>
        </div>
        <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
          <option value="">Selecciona negocio...</option>
          {negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <input type="number" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
        <input type="text" placeholder="Descripcion (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
        <button onClick={agregarMovimiento} disabled={enviando} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full">
          {enviando ? "Registrando..." : "Registrar"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : movimientosFiltrados.length === 0 ? (
        <p className="text-gray-400 text-sm">No hay movimientos con estos filtros.</p>
      ) : (
        <div className="space-y-2">
          {movimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${m.tipo === "recaudo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {m.tipo === "recaudo" ? "Recaudo" : "Egreso"}
                  </span>
                  <span className="text-xs text-gray-500">{m.negocios?.nombre}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString("es-CO")}</span>
              </div>
              {m.descripcion && <p className="text-sm text-gray-600 mb-2">{m.descripcion}</p>}
              <div className="flex items-center justify-between">
                <p className={`font-bold text-lg ${m.tipo === "recaudo" ? "text-green-600" : "text-red-600"}`}>
                  {m.tipo === "recaudo" ? "+" : "-"}{formatoCOP(m.monto)}
                </p>
                <button onClick={() => eliminarMovimiento(m.id)} className="text-red-500 text-sm hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}