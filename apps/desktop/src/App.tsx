import { Routes, Route, Navigate } from "react-router-dom";
import { DesktopShell } from "~/components/DesktopShell";
import { TasksPage } from "~/pages/Tasks";
import { CollaborationPage } from "~/pages/Collaboration";
import { KnowledgePage } from "~/pages/Knowledge";
import { SettingsPage } from "~/pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<DesktopShell />}>
        <Route index element={<Navigate to="/tasks" replace />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="collaboration" element={<CollaborationPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
