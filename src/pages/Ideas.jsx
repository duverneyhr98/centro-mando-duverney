import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const CATEGORIAS = [
  "Idea de negocio",
  "Promoción",
  "Redes sociales",
  "Nuevo producto",
  "Problema a resolver",
  "Sueño/Proyecto",
  "Por hacer",
  "Por comprar",
  "Por agendar",
];

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [negocioId, setNegocioId] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    fetchIdeas();
    fetchNegocios();
  }, []);

  async function fetchIdeas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ideas")
      .select("*, negocios(nombre, color_tema)")
      .order("created_at", { ascending: false });
    if (!error) setIdeas(data);
    setLoading(false);
  }

  async function fetchNegocios() {
    const { data } = await supabase.from("negocios").select("id, nombre");
    setNegocios(data || []);
  }

  async function agregarIdea() {
    if (!titulo.trim() || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("ideas").insert([{
      titulo,
      descripcion,
      categoria,
      negocio_id: negocioId || null,
      estado: "nueva",
    }]);
    if (!error) {
      setTitulo("");
      setDescripcion("");
      fetchIdeas();
    }
    setEnviando(false);
  }

  async function eliminarIdea(id) {
    await supabase.from("ideas").delete().eq("id", id);
    fetchIdeas();
  }

  async function reclasificar(id, nuevaCategoria, nuevoNegocioId) {
    await supabase.from("ideas").update({
      categoria: nuevaCategoria,
      negocio_id: nuevoNegocioId || null,
    }).eq("id", id);
    setEditando(null);
    fetchIdeas();
  }

  const sinClasificar = ideas.filter(i => i.categoria === "Sin clasificar");
  const clasificadas = ideas.filter(i => i.categoria !== "Sin clasificar");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Centro de Ideas</h1>
      <p className="text-gray-500 mb-6">Guarda y organiza tus ideas</p>

      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <input
          type="text"
          placeholder="Título de la idea..."
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <textarea
          placeholder="Descripción (opcional)..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          rows={2}
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={negocioId}
            onChange={(e) => setNegocioId(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">General (sin negocio)</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
          <button
            onClick={agregarIdea}
            disabled={enviando}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 ml-auto"
          >
            Guardar Idea
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando ideas...</p>
      ) : (
        <>
          {sinClasificar.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-700 mb-3">📥 Por clasificar ({sinClasificar.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {sinClasificar.map((idea) => (
                  <div key={idea.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="font-medium text-gray-800 mb-2">{idea.titulo}</p>
                    {editando === idea.id ? (
                      <div className="space-y-2">
                        <select
                          id={`cat-${idea.id}`}
                          defaultValue={CATEGORIAS[0]}
                          className="w-full border rounded-lg px-2 py-1 text-sm"
                        >
                          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                          id={`neg-${idea.id}`}
                          defaultValue=""
                          className="w-full border rounded-lg px-2 py-1 text-sm"
                        >
                          <option value="">General (sin negocio)</option>
                          {negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const cat = document.getElementById(`cat-${idea.id}`).value;
                              const neg = document.getElementById(`neg-${idea.id}`).value;
                              reclasificar(idea.id, cat, neg);
                            }}
                            className="text-xs bg-gray-900 text-white px-3 py-1 rounded-lg"
                          >
                            Guardar
                          </button>
                          <button onClick={() => setEditando(null)} className="text-xs text-gray-500">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setEditando(idea.id)} className="text-xs text-blue-600 hover:underline">
                          Clasificar
                        </button>
                        <button onClick={() => eliminarIdea(idea.id)} className="text-xs text-red-500 hover:underline">
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="font-semibold text-gray-700 mb-3">Ideas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clasificadas.map((idea) => (
              <div key={idea.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {idea.categoria}
                  </span>
                  <button
                    onClick={() => eliminarIdea(idea.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
                <h3 className="font-semibold text-gray-800">{idea.titulo}</h3>
                {idea.descripcion && (
                  <p className="text-sm text-gray-500 mt-1">{idea.descripcion}</p>
                )}
                {idea.negocios && (
                  <p className="text-xs text-gray-400 mt-2">📍 {idea.negocios.nombre}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}