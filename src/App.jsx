import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Negocios from "./pages/Negocios";
import Tareas from "./pages/Tareas";
import Ideas from "./pages/Ideas";
import Finanzas from "./pages/Finanzas";
import Recordatorios from "./pages/Recordatorios";
import Bandeja from "./pages/Bandeja";
import Deudas from "./pages/Deudas";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="negocios" element={<Negocios />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="recordatorios" element={<Recordatorios />} />
        <Route path="bandeja" element={<Bandeja />} />
        <Route path="deudas" element={<Deudas />} />
      </Route>
    </Routes>
  );
}

export default App;