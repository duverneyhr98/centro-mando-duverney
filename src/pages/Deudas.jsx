import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const hoyStr = () => new Date().toISOString().split("T")[0];

export default function Deudas() {
  const [pestana, setPestana] = useState("retiros");
  const [deudas, setDeudas] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroNegocio, setFiltroNegocio] = useState("todos");
  const [abonando, setAbonando] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");

  const [negocioId, setNegocioId] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [fecha, setFecha] = useState(hoyStr());
  const [origen, setOrigen] = useState("efectivo");

  const [prestPersona, setPrestPersona] = useState("");
  const [prestNegocioId, setPrestNegocioId] = useState("");
  const [prestMonto, setPrestMonto] = useState("");
  const [prestConcepto, setPrestConcepto] = useState("");
  const [prestFecha, setPrestFecha] = useState(hoyStr());

  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchDeudas();
    fetchPrestamos();
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

  async function fetchPrestamos() {
    const { data } = await supabase
      .from("deudas")
      .select("*, negocios(nombre)")
      .eq("tipo", "prestamo")
      .order("fecha", { ascending: false });
    if (data) setPrestamos(data);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarRetiro() {
    if (!negocioId || !monto || !fecha || enviando) return;
    setEnviando(true);

    const descripcionConcepto = concepto || (origen === "cuenta" ? "Retiro de cuenta bancaria" : "Retiro de caja efectivo");

    const { error } = await supabase.from("deudas").insert([{
      tipo: "negocio",
      negocio_id: negocioId,
      monto: parseFloat(monto),
      monto_pagado: 0,
      concepto: `${origen === "cuenta" ? "🏦 Cuenta: " : "💵 Efectivo: "}${descripcionConcepto}`,
      fecha,
      estado: "pendiente",
    }]);

    if (!error) {
      if (origen === "efectivo") {
        await supabase.from("transacciones_financieras").insert([{
          tipo: "gasto",
          descripcion: descripcionConcepto,
          monto: parseFloat(monto),
          negocio_id: negocioId,
          categoria: "Retiro personal",
        }]);
      }
      setNegocioId(""); setMonto(""); setConcepto(""); setFecha(hoyStr()); setOrigen("efectivo");
      fetchDeudas();
    }
    setEnviando(false);
  }

  async function agregarPrestamo() {
    if (!prestPersona || !prestNegocioId || !prestMonto || !prestFecha || enviando) return;
    setEnviando(true);

    const { error } = await supabase.from("deudas").insert([{
      tipo: "prestamo",
      tercero: prestPersona,
      negocio_id: prestNegocioId,
      monto: parseFloat(prestMonto),
      monto_pagado: 0,
      concepto: prestConcepto,
      fecha: prestFecha,
      estado: "pendiente",
    }]);

    if (!error) {
      await supabase.from("transacciones_financieras").insert([{
        tipo: "recaudo",
        descripcion: `Préstamo de ${prestPersona}: ${prestConcepto || ""}`,
        monto: parseFloat(prestMonto),
        negocio_id: prestNegocioId,
        categoria: "Préstamo recibido",
      }]);
      setPrestPersona(""); setPrestNegocioId(""); setPrestMonto(""); setPrestConcepto(""); setPrestFecha(hoyStr());
      fetchPrestamos();
    }
    setEnviando(false);
  }

  async function confirmarAbono(deuda, esRetiro) {
    const abono = parseFloat(montoAbono);
    if (!abono || abono <= 0) return;

    const nuevoPagado = Number(deuda.monto_pagado) + abono;
    const nuevoEstado = nuevoPagado >= Number(deuda.monto) ? "pagado" : "pendiente";

    await supabase.from("deudas").update({ monto_pagado: nuevoPagado, estado: nuevoEstado }).eq("id", deuda.id);

    await supabase.from("transacciones_financieras").insert([{
      tipo: "recaudo",
      descripcion: `Abono ${esRetiro ? "retiro" : "préstamo"}: ${deuda.concepto || ""}`,
      monto: abono,
      negocio_id: deuda.negocio_id,
      categoria: esRetiro ? "Abono de deuda" : "Pago de préstamo",
    }]);

    setAbonando(null); setMontoAbono("");
    esRetiro ? fetchDeudas() : fetchPrestamos();
  }

  async function eliminar(id, esRetiro) {
    await supabase.from("deudas").delete().eq("id", id);
    esRetiro ? fetchDeudas() : fetchPrestamos();
  }

  const formatoCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

  const totalRetiros = deudas.filter(d => d.estado === "pendiente").reduce((acc, d) => acc + Number(d.monto) - Number(d.monto_pagado), 0);
  const totalPrestamos = prestamos.filter(d => d.estado === "pendiente").reduce((acc, d) => acc + Number(d.monto) - Number(d.monto_pagado), 0);

  const resumenPorNegocio = {};
  negocios.forEach(n => resumenPorNegocio[n.id] = { nombre: n.nombre, total: 0 });
  deudas.filter(d => d.estado === "pendiente").forEach(d => {
    if (resumenPorNegocio[d.negocio_id]) resumenPorNegocio[d.negocio_id].total += Number(d.monto) - Number(d.monto_pagado);
  });

  const pendientesRetiros = deudas.filter(d => d.estado === "pendiente" && (filtroNegocio === "todos" || d.negocio_id === filtroNegocio));
  const pagadosRetiros = deudas.filter(d => d.estado === "pagado" && (filtroNegocio === "todos" || d.negocio_id === filtroNegocio));
  const pendientesPrestamos = prestamos.filter(d => d.estado === "pendiente");
  const pagadosPrestamos = prestamos.filter(d => d.estado === "pagado");

  const renderTarjeta = (d, esRetiro) => {
    const saldo = Number(d.monto) - Number(d.monto_pagado);
    return (
      <div key={d.id} className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.negocios?.nombre}</span>
            {!esRetiro && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{d.tercero}</span>}
          </div>
          <span className="text-xs text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
        </div>
        <p className="text-sm text-gray-600 mb-1">{d.concepto || "Sin descripción"}</p>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-red-600">{formatoCOP(saldo)} <span className="text-xs text-gray-400">saldo</span></p>
            {Number(d.monto_pagado) > 0 && <p className="text-xs text-gray-400">Abonado: {formatoCOP(d.monto_pagado)} de {formatoCOP(d.monto)}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setAbonando(d.id); setMontoAbono(""); }} className="text-sm text-green-600 hover:underline">Abonar</button>
            <button onClick={() => eliminar(d.id, esRetiro)} className="text-sm text-red-500 hover:underline">Eliminar</button>
          </div>
        </div>
        {abonando === d.id && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm text-gray-600">¿Cuánto vas a abonar? (máx. {formatoCOP(saldo)})</p>
            <input type="number" placeholder="Monto del abono" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => confirmarAbono(d, esRetiro)} className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm">Confirmar abono</button>
              <button onClick={() => setAbonando(null)} className="text-sm text-gray-500">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Deudas</h1>
      <p className="text-gray-500 mb-4">Retiros de negocios y préstamos recibidos</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setPestana("retiros")} className={`px-4 py-2 rounded-lg text-sm font-medium ${pestana === "retiros" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
          Mis retiros
        </button>
        <button onClick={() => setPestana("prestamos")} className={`px-4 py-2 rounded-lg text-sm font-medium ${pestana === "prestamos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
          Préstamos recibidos
        </button>
      </div>

      {pestana === "retiros" && (
        <div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500 mb-4">
            <p className="text-sm text-gray-500">Total que debes a tus negocios</p>
            <p className="text-2xl font-bold text-red-600">{formatoCOP(totalRetiros)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => setFiltroNegocio("todos")} className={`bg-white rounded-xl shadow p-4 text-left border-2 ${filtroNegocio === "todos" ? "border-gray-900" : "border-gray-100"}`}>
              <p className="text-sm text-gray-500">Todos</p>
              <p className="text-lg font-bold text-gray-800">{formatoCOP(totalRetiros)}</p>
            </button>
            {Object.entries(resumenPorNegocio).map(([id, n]) => (
              <button key={id} onClick={() => setFiltroNegocio(filtroNegocio === id ? "todos" : id)} className={`bg-white rounded-xl shadow p-4 text-left border-2 ${filtroNegocio === id ? "border-gray-900" : n.total > 0 ? "border-red-200" : "border-gray-100"}`}>
                <p className="text-sm text-gray-500">{n.nombre}</p>
                <p className={`text-lg font-bold ${n.total > 0 ? "text-red-600" : "text-gray-400"}`}>{formatoCOP(n.total)}</p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
            <p className="font-semibold text-gray-700">Registrar retiro</p>
            <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">¿De qué negocio cogiste la plata?</option>
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="efectivo">💵 De la caja efectivo</option>
              <option value="cuenta">🏦 De la cuenta bancaria</option>
            </select>
            <input type="number" placeholder="¿Cuánto cogiste?" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <input type="text" placeholder="¿Para qué? ej: pagar préstamo" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <button onClick={agregarRetiro} disabled={enviando} className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {enviando ? "Registrando..." : "Registrar retiro"}
            </button>
          </div>

          <h2 className="font-semibold text-gray-700 mb-2">Pendientes {filtroNegocio !== "todos" ? `— ${resumenPorNegocio[filtroNegocio]?.nombre}` : ""}</h2>
          {loading ? <p className="text-gray-500">Cargando...</p> : pendientesRetiros.length === 0 ? (
            <p className="text-gray-400 text-sm mb-6">No hay retiros pendientes.</p>
          ) : (
            <div className="space-y-2 mb-6">{pendientesRetiros.map(d => renderTarjeta(d, true))}</div>
          )}

          {pagadosRetiros.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-700 mb-2">Pagados</h2>
              <div className="space-y-2">
                {pagadosRetiros.map(d => (
                  <div key={d.id} className="bg-gray-50 rounded-xl p-4 opacity-60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{d.negocios?.nombre}</span>
                      <span className="text-xs text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-through">{d.concepto || "Sin descripción"}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-400">{formatoCOP(d.monto)}</p>
                      <button onClick={() => eliminar(d.id, true)} className="text-sm text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {pestana === "prestamos" && (
        <div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500 mb-6">
            <p className="text-sm text-gray-500">Total préstamos pendientes de pagar</p>
            <p className="text-2xl font-bold text-purple-600">{formatoCOP(totalPrestamos)}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
            <p className="font-semibold text-gray-700">Registrar préstamo</p>
            <input type="text" placeholder="¿Quién prestó? ej: Novia, Hermana" value={prestPersona} onChange={(e) => setPrestPersona(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <select value={prestNegocioId} onChange={(e) => setPrestNegocioId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">¿A qué negocio le prestó?</option>
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            <input type="number" placeholder="¿Cuánto prestó?" value={prestMonto} onChange={(e) => setPrestMonto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <input type="text" placeholder="¿Para qué? (opcional)" value={prestConcepto} onChange={(e) => setPrestConcepto(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <input type="date" value={prestFecha} onChange={(e) => setPrestFecha(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <button onClick={agregarPrestamo} disabled={enviando} className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {enviando ? "Registrando..." : "Registrar préstamo"}
            </button>
          </div>

          <h2 className="font-semibold text-gray-700 mb-2">Pendientes</h2>
          {pendientesPrestamos.length === 0 ? (
            <p className="text-gray-400 text-sm mb-6">No hay préstamos pendientes.</p>
          ) : (
            <div className="space-y-2 mb-6">{pendientesPrestamos.map(d => renderTarjeta(d, false))}</div>
          )}

          {pagadosPrestamos.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-700 mb-2">Pagados</h2>
              <div className="space-y-2">
                {pagadosPrestamos.map(d => (
                  <div key={d.id} className="bg-gray-50 rounded-xl p-4 opacity-60">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex gap-2">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{d.negocios?.nombre}</span>
                        <span className="text-xs bg-purple-100 text-purple-500 px-2 py-0.5 rounded-full">{d.tercero}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(d.fecha).toLocaleDateString("es-CO")}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-through">{d.concepto || "Sin descripción"}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-400">{formatoCOP(d.monto)}</p>
                      <button onClick={() => eliminar(d.id, false)} className="text-sm text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}