import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FieldPreferences } from "./components/FieldSettings";
import { InteractionAudioProvider } from "./components/InteractionAudio";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><ErrorBoundary><InteractionAudioProvider><FieldPreferences><App /></FieldPreferences></InteractionAudioProvider></ErrorBoundary></StrictMode>);
