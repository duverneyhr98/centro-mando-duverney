import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const CATEGORIAS_IDEA = ["Idea de negocio", "Promoción", "Redes sociales", "Nuevo producto", "Problema a resolver", "Sueño/Proyecto"];
const PRIORIDADES = ["alta", "media", "baja"];
const CATEGORIAS_RECORDATORIO = ["Banco", "Crédito", "Servicio", "Arriendo", "Nómina", "Proveedor", "Impuesto", "Otro"];

export default function Bandeja() {
  const [items, setItems] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [tipo, setTipo] = useState("idea");
  const [campos, setCampos] = useState({});

  useEffect(() => {
    fetchItems();
    fetchNegocios();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase.from("bandeja").select("*").order("created_at", { ascending: false });
    if (!error) setItems(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  function abrirProcesar(item) {
    setProcesando(item.id);
    setTipo("idea");
    setCampos({
      titulo: item.texto,
      categoria: CATEGORIAS_IDEA[0],
      negocio_id: "",
      prioridad: "media",
      fecha_limite: "",
      fecha_vencimiento: "",
      monto: "",
    });
  }

  async function confirmarProcesar(item) {
    if (tipo === "idea") {
      await supabase.from("ideas").insert([{
        titulo: campos.titulo,
        categoria: campos.categoria,
        negocio_id: campos.negocio_id || null,
        estado: "nueva",
      }]);
    } else if (tipo === "tarea") {
      await supabase.from("tareas").insert([{
        titulo: campos.titulo,
        estado: "pendiente",
        prioridad: campos.prioridad,
        fecha_limite: campos.fecha_limite || null,
        negocio_id: campos.negocio_id || null,
      }]);
    } else if (tipo === "recordatorio") {
      await supabase.from("recordatorios").insert([{
        titulo: campos.titulo,
        categoria: campos.categoria || "Otro",
        monto: campos.monto ? parseFloat(campos.monto) : null,
        fecha_vencimiento: campos.fecha_vencimiento,
        frecuencia: "Única vez",
        negocio_id: campos.negocio_id || null,
        estado: "pendiente",
      }]);
    } else if (tipo === "retiro") {
      await supabase.from("transacciones_financieras").insert([{
        tipo: "gasto",
        descripcion: campos.titulo,
        monto: campos.monto ? parseFloat(campos.monto) : 0,
        negocio_id: campos.negocio_id || null,
        categoria: "Retiro de caja",
      }]);
    }

    await supabase.from("bandeja").delete().eq("id", item.id);
    setProcesando(null);
    fetchItems();
  }

  async function eliminarItem(id) {
    await supabase.from("bandeja").delete().eq("id", id);
    fetchItems();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Bandeja de entrada</h1>
      <p className="text-gray-500 mb-6">Todo lo que capturaste rápidamente. Clasifícalo aquí.</p>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm">Tu bandeja está vacía. Usa el botón "+" para capturar pensamientos rápidos.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-4">
              {procesando === item.id ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-800">{item.texto}</p>

                  <div className="flex gap-2 flex-wrap">
                    {["idea", "tarea", "recordatorio", "retiro"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipo(t)}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                          tipo === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t === "retiro" ? "Retiro de caja" : t}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={campos.titulo}
                    onChange={(e) => setCampos({ ...campos, titulo: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Título"
                  />

                  {tipo === "idea" && (
                    <select
                      value={campos.categoria}
                      onChange={(e) => setCampos({ ...campos, categoria: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {CATEGORIAS_IDEA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  {tipo === "tarea" && (
                    <div className="flex gap-2">
                      <select
                        value={campos.prioridad}
                        onChange={(e) => setCampos({ ...campos, prioridad: e.target.value })}
                        className="border rounded-lg px-3 py-2 flex-1"
                      >
                        {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input
                        type="date"
                        value={campos.fecha_limite}
                        onChange={(e) => setCampos({ ...campos, fecha_limite: e.target.value })}
                        className="border rounded-lg px-3 py-2 flex-1"
                      />
                    </div>
                  )}

                  {tipo === "recordatorio" && (
                    <div className="space-y-2">
                      <select
                        value={campos.categoria}
                        onChange={(e) => setCampos({ ...campos, categoria: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        {CATEGORIAS_RECORDATORIO.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Monto (opcional)"
                          value={campos.monto}
                          onChange={(e) => setCampos({ ...campos, monto: e.target.value })}
                          className="border rounded-lg px-3 py-2 flex-1"
                        />
                        <input
                          type="date"
                          value={campos.fecha_vencimiento}
                          onChange={(e) => setCampos({ ...campos, fecha_vencimiento: e.target.value })}
                          className="border rounded-lg px-3 py-2 flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {tipo === "retiro" && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">¿Cuánto sacaste y de qué negocio?</p>
                      <input
                        type="number"
                        placeholder="Monto retirado"
                        value={campos.monto}
                        onChange={(e) => setCampos({ ...campos, monto: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  )}

                  <select
                    value={campos.negocio_id}
                    onChange={(e) => setCampos({ ...campos, negocio_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Personal / General</option>
                    {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarProcesar(item)}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setProcesando(null)} className="text-gray-500 text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-800">{item.texto}</p>
                  <div className="flex gap-3">
                    <button onClick={() => abrirProcesar(item)} className="text-sm text-blue-600 hover:underline">
                      Clasificar
                    </button>
                    <button onClick={() => eliminarItem(item.id)} className="text-sm text-red-500 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}