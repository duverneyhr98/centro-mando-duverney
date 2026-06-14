import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { LayoutGrid, List } from "lucide-react";

const ESTADOS = [
  { key: "pendiente", label: "Pendiente", color: "bg-gray-100" },
  { key: "en_proceso", label: "En Proceso", color: "bg-blue-100" },
  { key: "terminada", label: "Terminada", color: "bg-green-100" },
];

const PRIORIDADES = [
  { key: "alta", label: "Alta", color: "bg-red-100 text-red-700" },
  { key: "media", label: "Media", color: "bg-yellow-100 text-yellow-700" },
  { key: "baja", label: "Baja", color: "bg-gray-100 text-gray-600" },
];

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [vista, setVista] = useState("kanban");
  const [filtroNegocio, setFiltroNegocio] = useState("todos");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaPrioridad, setNuevaPrioridad] = useState("media");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoNegocio, setNuevoNegocio] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchTareas();
    fetchNegocios();
  }, []);

  async function fetchTareas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tareas")
      .select("*, negocios(nombre, color_tema)")
      .order("created_at", { ascending: false });
    if (!error) setTareas(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarTarea() {
    if (!nuevoTitulo.trim() || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("tareas").insert([{
      titulo: nuevoTitulo,
      estado: "pendiente",
      prioridad: nuevaPrioridad,
      fecha_limite: nuevaFecha || null,
      negocio_id: nuevoNegocio || null,
    }]);
    if (!error) {
      setNuevoTitulo("");
      setNuevaFecha("");
      setNuevaPrioridad("media");
      setNuevoNegocio("");
      fetchTareas();
    }
    setEnviando(false);
  }

  async function cambiarEstado(id, nuevoEstado) {
    await supabase.from("tareas").update({ estado: nuevoEstado }).eq("id", id);
    fetchTareas();
  }

  async function cambiarPrioridad(id, nuevaPrioridad) {
    await supabase.from("tareas").update({ prioridad: nuevaPrioridad }).eq("id", id);
    fetchTareas();
  }

  async function eliminarTarea(id) {
    await supabase.from("tareas").delete().eq("id", id);
    fetchTareas();
  }

  function prioridadInfo(key) {
    return PRIORIDADES.find(p => p.key === key) || PRIORIDADES[1];
  }

  function bordePrioridad(key) {
    if (key === "alta") return "border-red-400";
    if (key === "media") return "border-yellow-400";
    return "border-gray-300";
  }

  const tareasFiltradas = filtroNegocio === "todos"
    ? tareas
    : filtroNegocio === "personal"
      ? tareas.filter(t => !t.negocio_id)
      : tareas.filter(t => t.negocio_id === filtroNegocio);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Centro de Tareas</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setVista("kanban")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
              vista === "kanban" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            <LayoutGrid size={14} /> Tablero
          </button>
          <button
            onClick={() => setVista("tabla")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
              vista === "tabla" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            <List size={14} /> Tabla
          </button>
        </div>
      </div>
      <p className="text-gray-500 mb-4">Organiza tus pendientes personales y de negocios</p>

      {/* Filtro por negocio */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFiltroNegocio("todos")}
          className={`px-3 py-1.5 rounded-full text-sm ${filtroNegocio === "todos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFiltroNegocio("personal")}
          className={`px-3 py-1.5 rounded-full text-sm ${filtroNegocio === "personal" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Personal
        </button>
        {negocios.map((n) => (
          <button
            key={n.id}
            onClick={() => setFiltroNegocio(n.id)}
            className={`px-3 py-1.5 rounded-full text-sm ${filtroNegocio === n.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-2 flex-wrap">
        <input
          type="text"
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregarTarea()}
          placeholder="Nueva tarea..."
          className="flex-1 border rounded-lg px-3 py-2 min-w-[150px]"
        />
        <select
          value={nuevaPrioridad}
          onChange={(e) => setNuevaPrioridad(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={nuevoNegocio}
          onChange={(e) => setNuevoNegocio(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Personal</option>
          {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <button
          onClick={agregarTarea}
          disabled={enviando}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando tareas...</p>
      ) : vista === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ESTADOS.map((estado) => (
            <div key={estado.key} className={`rounded-xl p-4 ${estado.color}`}>
              <h3 className="font-semibold text-gray-700 mb-3">{estado.label}</h3>
              <div className="space-y-2">
                {tareasFiltradas
                  .filter((t) => t.estado === estado.key)
                  .map((tarea) => {
                    const p = prioridadInfo(tarea.prioridad);
                    return (
                      <div key={tarea.id} className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${bordePrioridad(tarea.prioridad)}`}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.color}`}>{p.label}</span>
                          {tarea.fecha_limite && (
                            <span className="text-xs text-gray-400">
                              {new Date(tarea.fecha_limite).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {tarea.negocios ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{tarea.negocios.nombre}</span>
                          ) : (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Personal</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{tarea.titulo}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {ESTADOS.filter((e) => e.key !== tarea.estado).map((e) => (
                            <button
                              key={e.key}
                              onClick={() => cambiarEstado(tarea.id, e.key)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              → {e.label}
                            </button>
                          ))}
                          <button
                            onClick={() => eliminarTarea(tarea.id)}
                            className="text-xs text-red-500 hover:underline ml-auto"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="p-3">Tarea</th>
                <th className="p-3">Negocio</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Prioridad</th>
                <th className="p-3">Fecha límite</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {tareasFiltradas.map((t) => {
                const p = prioridadInfo(t.prioridad);
                return (
                  <tr key={t.id} className={`border-t border-l-4 ${bordePrioridad(t.prioridad)}`}>
                    <td className="p-3 text-gray-800">{t.titulo}</td>
                    <td className="p-3 text-gray-500">{t.negocios ? t.negocios.nombre : "Personal"}</td>
                    <td className="p-3">
                      <select
                        value={t.estado}
                        onChange={(ev) => cambiarEstado(t.id, ev.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-transparent"
                      >
                        {ESTADOS.map(es => <option key={es.key} value={es.key}>{es.label}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={t.prioridad || "media"}
                        onChange={(ev) => cambiarPrioridad(t.id, ev.target.value)}
                        className={`text-xs rounded px-2 py-1 border-none ${p.color}`}
                      >
                        {PRIORIDADES.map(pr => <option key={pr.key} value={pr.key}>{pr.label}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-gray-500">
                      {t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString("es-CO") : "-"}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => eliminarTarea(t.id)} className="text-red-500 text-xs hover:underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}