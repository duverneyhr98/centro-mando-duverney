import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Negocios() {
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNegocios();
  }, []);

  async function fetchNegocios() {
    setLoading(true);
    const { data, error } = await supabase
      .from("negocios")
      .select("*")
      .order("created_at");

    if (error) {
      console.error(error);
    } else {
      setNegocios(data);
    }
    setLoading(false);
  }

  if (loading) return <p className="text-gray-500">Cargando negocios...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Mis Negocios</h1>
      <p className="text-gray-500 mb-6">Administra todas tus unidades de negocio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {negocios.map((negocio) => (
          <div
            key={negocio.id}
            className="bg-white rounded-xl shadow p-5 border-l-4"
            style={{ borderColor: negocio.color_tema }}
          >
            <h3 className="text-lg font-semibold text-gray-800">{negocio.nombre}</h3>
            <p className="text-sm text-gray-500 capitalize">{negocio.tipo}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
              negocio.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {negocio.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}