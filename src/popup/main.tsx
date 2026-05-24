import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { theme } from "./theme";

const container = document.getElementById("root");
if (!container) throw new Error("popup root element missing");
createRoot(container).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <ModalsProvider>
      <Notifications position="top-right" />
      <App />
    </ModalsProvider>
  </MantineProvider>,
);
