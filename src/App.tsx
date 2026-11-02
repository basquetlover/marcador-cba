
import "./App.css";

import { Route, Routes } from "react-router";

import Control from "./pages/Control";

import MarcadorProvider from "./marcador/MarcadorProvider";
import Diagnostico from "./pages/Diagnostico";


/* ============================================
   MARCADOR CBA
   Aplicación principal
   ============================================ */


// 1. COMPONENTE PRINCIPAL

export default function App() {

    // 2. ÚNICO RETURN

    return (
        <MarcadorProvider>

            <Routes>

                {/* PANEL PRINCIPAL */}
                <Route
                    path="/"
                    element={<Control />}
                />

                {/* PANEL DE CONTROL */}
                <Route
                    path="/control"
                    element={<Control />}
                />

                <Route
                    path="/diagnostico"
                    element={<Diagnostico />}
                />

            </Routes>

        </MarcadorProvider>
    );
}
