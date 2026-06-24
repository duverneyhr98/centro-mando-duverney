import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Deudas() {
  const [deudas, setDeudas] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [negocioId, setNegocioId] = useState("");
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
      .order("created_at", { ascending: false });
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

    // Registrar la deuda
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
      // También registrar como gasto en Finanzas
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

    // Registrar el pago como recaudo en Finanzas
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
  const pendientes = deudas.filter(d => d.estado === "pendiente");
  const pagados = deudas.filter(d => d.estado === "pagado");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Deudas a mis negocios</h1>
      <p className="text-gray-500 mb-6">Plata que retiras de los negocios y debes devolver al hacer inventario</p>

      <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500 mb-6">
        <p className="text-sm text-gray-500">Total que debes a tus negocios</p>
        <p className="text-2xl font-bold text-red-600">{formatoCOP(totalPendiente)}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <p className="font-semibold text-gray-700">Registrar retiro</p>
        <select
          value={negocioId}
          onChange={(e) => setNegocioId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">¿De qué negocio cogiste la plata?</option>
          {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <input
          type="number"
          placeholder="¿Cuánto cogiste?"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          type="text"
          placeholder="¿Para qué? (opcional)"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button
          onClick={agregarDeuda}
          disabled={enviando}
          className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {enviando ? "Registrando..." : "Registrar retiro"}
        </button>
      </div>

      <h2 className="font-semibold text-gray-700 mb-2">Pendientes de pagar</h2>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">No tienes retiros pendientes.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {pendientes.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800">{d.negocios?.nombre}</span>
                <span className="text-sm text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{d.concepto || "Sin descripción"}</p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-red-600">{formatoCOP(d.monto)}</p>
                <div className="flex gap-3">
                  <button onClick={() => marcarPagado(d.id)} className="text-sm text-green-600 hover:underline">
                    Pagado ✓
                  </button>
                  <button onClick={() => eliminar(d.id)} className="text-sm text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagados.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mb-2">Pagados</h2>
          <div className="space-y-2">
            {pagados.map(d => (
              <div key={d.id} className="bg-gray-50 rounded-xl p-4 opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600 line-through">{d.negocios?.nombre}</span>
                  <span className="text-sm text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{d.concepto || "Sin descripción"}</p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-400">{formatoCOP(d.monto)}</p>
                  <button onClick={() => eliminar(d.id)} className="text-sm text-red-400 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}