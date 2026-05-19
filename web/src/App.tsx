import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./routes/Layout";
import { ModelsIndex } from "./routes/ModelsIndex";
import { ProviderPage } from "./routes/ProviderPage";
import { ModelPage } from "./routes/ModelPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ModelsIndex />} />
          <Route path=":provider" element={<ProviderPage />} />
          <Route path=":provider/:model" element={<ModelPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
