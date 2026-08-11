import "./App.css";
import { Route, Routes } from "react-router";
import Control from "./pages/Control";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Control />} />
      <Route path="/control" element={<Control />} />
    </Routes>
  );
}