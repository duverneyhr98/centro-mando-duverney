import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const TIPOS = [
  { key: "recaudo", label: "Recaudo (entra a la caja)", signo: 1 },
  { key: "gasto", label: "Gasto / Salida de caja", signo: -1 },
];

export default function Finanzas() {
  const [movimientos, setMovimientos] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [tipo, setTipo] = useState("recaudo");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [negocioId, setNegocioId] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchMovimientos();
    fetchNegocios();
  }, []);

  async function fetchMovimientos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("transacciones_financieras")
      .select("*, negocios(nombre, color_tema)")
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
    if (!error) {
      setMonto("");
      setDescripcion("");
      fetchMovimientos();
    }
    setEnviando(false);
  }

  async function eliminarMovimiento(id) {
    await supabase.from("transacciones_financieras").delete().eq("id", id);
    fetchMovimientos();
  }

  const cajaTotal = movimientos.reduce((acc, m) => {
    const signo = m.tipo === "recaudo" ? 1 : -1;
    return acc + signo * Number(m.monto);
  }, 0);

  const saldosPorNegocio = {};
  negocios.forEach((n) => (saldosPorNegocio[n.id] = { nombre: n.nombre, saldo: 0 }));
  movimientos.forEach((m) => {
    const signo = m.tipo === "recaudo" ? 1 : -1;
    if (saldosPorNegocio[m.negocio_id]) {
      saldosPorNegocio[m.negocio_id].saldo += signo * Number(m.monto);
    }
  });

  const formatoCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Finanzas</h1>
      <p className="text-gray-500 mb-6">Caja única, separación virtual por negocio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Caja Total (efectivo real)</p>
          <p className="text-2xl font-bold text-gray-800">{formatoCOP(cajaTotal)}</p>
        </div>
        {Object.values(saldosPorNegocio).map((n) => (
          <div key={n.nombre} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">{n.nombre}</p>
            <p className="text-xl font-bold text-gray-800">{formatoCOP(n.saldo)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTipo(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tipo === t.key
                  ? t.key === "recaudo"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={negocioId}
            onChange={(e) => setNegocioId(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Selecciona negocio...</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <button
            onClick={agregarMovimiento}
            disabled={enviando}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full"
          >
            Registrar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando movimientos...</p>
      ) : (
        <div className="space-y-2">
          {movimientos.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  m.tipo === "recaudo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {m.tipo === "recaudo" ? "Recaudo" : "Gasto"}
                </span>
                <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString("es-CO")}</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{m.negocios?.nombre || "Personal"}</p>
              <p className="text-sm text-gray-700 mb-2">{m.descripcion || "-"}</p>
              <div className="flex items-center justify-between">
                <p className={`font-bold text-lg ${m.tipo === "recaudo" ? "text-green-600" : "text-red-600"}`}>
                  {m.tipo === "recaudo" ? "+" : "-"}{formatoCOP(m.monto)}
                </p>
                <button
                  onClick={() => eliminarMovimiento(m.id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}