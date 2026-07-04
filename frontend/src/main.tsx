import React from "react";
import { createRoot } from "react-dom/client";
import { WorkbenchApp as App } from "./workbench/WorkbenchApp";
import "./workbench.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
