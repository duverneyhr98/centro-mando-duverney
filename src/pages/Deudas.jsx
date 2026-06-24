import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Deudas() {
  const [deudas, setDeudas] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [negocioId, setNegocioId] = useState("");
  const [filtroNegocio, setFiltroNegocio] = useState("todos");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchDeudas();
    fetchNegocios();
  }, []);

  async function fetchDeudas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deudas")
      .select("*, negocios(nombre)")
      .eq("tipo", "negocio")
      .order("fecha", { ascending: false });
    if (!error) setDeudas(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarDeuda() {
    if (!negocioId || !monto || !fecha || enviando) return;
    setEnviando(true);

    const { error: errorDeuda } = await supabase.from("deudas").insert([{
      tipo: "negocio",
      negocio_id: negocioId,
      monto: parseFloat(monto),
      monto_pagado: 0,
      concepto,
      fecha,
      estado: "pendiente",
    }]);

    if (!errorDeuda) {
      await supabase.from("transacciones_financieras").insert([{
        tipo: "gasto",
        descripcion: concepto || "Retiro personal del negocio",
        monto: parseFloat(monto),
        negocio_id: negocioId,
        categoria: "Retiro personal",
      }]);

      setNegocioId("");
      setMonto("");
      setConcepto("");
      setFecha("");
      fetchDeudas();
    }
    setEnviando(false);
  }

  async function marcarPagado(id) {
    const deuda = deudas.find(d => d.id === id);
    await supabase.from("deudas").update({ estado: "pagado", monto_pagado: deuda?.monto }).eq("id", id);

    if (deuda) {
      await supabase.from("transacciones_financieras").insert([{
        tipo: "recaudo",
        descripcion: `Pago de deuda: ${deuda.concepto || "retiro personal"}`,
        monto: deuda.monto,
        negocio_id: deuda.negocio_id,
        categoria: "Pago de deuda",
      }]);
    }

    fetchDeudas();
  }

  async function eliminar(id) {
    await supabase.from("deudas").delete().eq("id", id);
    fetchDeudas();
  }

  const formatoCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

  const totalPendiente = deudas.filter(d => d.estado === "pendiente").reduce((acc, d) => acc + Number(d.monto), 0);

  const resumenPorNegocio = {};
  negocios.forEach(n => resumenPorNegocio[n.id] = { nombre: n.nombre, total: 0 });
  deudas.filter(d => d.estado === "pendiente").forEach(d => {
    if (resumenPorNegocio[d.negocio_id]) {
      resumenPorNegocio[d.negocio_id].total += Number(d.monto);
    }
  });

  const pendientesFiltradas = deudas.filter(d =>
    d.estado === "pendiente" && (filtroNegocio === "todos" || d.negocio_id === filtroNegocio)
  );

  const pagadosFiltrados = deudas.filter(d =>
    d.estado === "pagado" && (filtroNegocio === "todos" || d.negocio_id === filtroNegocio)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Deudas a mis negocios</h1>
      <p className="text-gray-500 mb-6">Plata que retiras de los negocios y debes devolver al hacer inventario</p>

      {/* Total general */}
      <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500 mb-4">
        <p className="text-sm text-gray-500">Total que debes a todos tus negocios</p>
        <p className="text-2xl font-bold text-red-600">{formatoCOP(totalPendiente)}</p>
      </div>

      {/* Resumen por negocio - tarjetas filtrables */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setFiltroNegocio("todos")}
          className={`bg-white rounded-xl shadow p-4 text-left border-2 ${filtroNegocio === "todos" ? "border-gray-900" : "border-gray-100"}`}
        >
          <p className="text-sm text-gray-500">Todos</p>
          <p className="text-lg font-bold text-gray-800">{formatoCOP(totalPendiente)}</p>
        </button>
        {Object.entries(resumenPorNegocio).map(([id, n]) => (
          <button
            key={id}
            onClick={() => setFiltroNegocio(filtroNegocio === id ? "todos" : id)}
            className={`bg-white rounded-xl shadow p-4 text-left border-2 ${filtroNegocio === id ? "border-gray-900" : n.total > 0 ? "border-red-200" : "border-gray-100"}`}
          >
            <p className="text-sm text-gray-500">{n.nombre}</p>
            <p className={`text-lg font-bold ${n.total > 0 ? "text-red-600" : "text-gray-400"}`}>{formatoCOP(n.total)}</p>
          </button>
        ))}
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <p className="font-semibold text-gray-700">Registrar retiro</p>
        <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
          <option value="">¿De qué negocio cogiste la plata?</option>
          {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <input type="number" placeholder="¿Cuánto cogiste?" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
        <input type="text" placeholder="¿Para qué? ej: pagar préstamo" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
        <button onClick={agregarDeuda} disabled={enviando} className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
          {enviando ? "Registrando..." : "Registrar retiro"}
        </button>
      </div>

      {/* Lista pendientes */}
      <h2 className="font-semibold text-gray-700 mb-2">
        Pendientes {filtroNegocio !== "todos" ? `— ${resumenPorNegocio[filtroNegocio]?.nombre}` : ""}
      </h2>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : pendientesFiltradas.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">No hay retiros pendientes.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {pendientesFiltradas.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.negocios?.nombre}</span>
                <span className="text-xs text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{d.concepto || "Sin descripción"}</p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-red-600">{formatoCOP(d.monto)}</p>
                <div className="flex gap-3">
                  <button onClick={() => marcarPagado(d.id)} className="text-sm text-green-600 hover:underline">Pagado ✓</button>
                  <button onClick={() => eliminar(d.id)} className="text-sm text-red-500 hover:underline">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista pagados */}
      {pagadosFiltrados.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mb-2">Pagados</h2>
          <div className="space-y-2">
            {pagadosFiltrados.map(d => (
              <div key={d.id} className="bg-gray-50 rounded-xl p-4 opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{d.negocios?.nombre}</span>
                  <span className="text-xs text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
                </div>
                <p className="text-sm text-gray-500 mb-2 line-through">{d.concepto || "Sin descripción"}</p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-400">{formatoCOP(d.monto)}</p>
                  <button onClick={() => eliminar(d.id)} className="text-sm text-red-400 hover:underline">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}