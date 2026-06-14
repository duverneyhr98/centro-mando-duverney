import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Plus, X } from "lucide-react";

export default function CapturaRapida() {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  async function guardar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
  const { error } = await supabase.from("bandeja").insert([{
      texto: texto,
    }]);
    if (!error) {
      setTexto("");
      setExito(true);
      setTimeout(() => {
        setExito(false);
        setOpen(false);
      }, 800);
    }
    setEnviando(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-gray-800 transition"
        >
          <Plus size={26} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-end md:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:w-96 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-800">Captura rápida</p>
              <button onClick={() => setOpen(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <textarea
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe lo que se te ocurra: pendiente, idea, compra, recordatorio..."
              className="w-full border rounded-lg px-3 py-2 mb-3"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  guardar();
                }
              }}
            />
            <button
              onClick={guardar}
              disabled={enviando}
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {exito ? "Guardado ✓" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}