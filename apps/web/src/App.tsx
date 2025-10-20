import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PupilWorkspace from "./pages/PupilWorkspace";
import TeacherConsole from "./pages/TeacherConsole";
import ShellLayout from "./components/ShellLayout";
import { GlobalMenuProvider } from "./components/GlobalMenu";

const App = () => {
  return (
    <GlobalMenuProvider>
      {/* ShellLayout provides the shared navigation chrome while nested routes swap the main view. */}
      <ShellLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pupil/*" element={<PupilWorkspace />} />
          <Route path="/teacher/*" element={<TeacherConsole />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ShellLayout>
    </GlobalMenuProvider>
  );
};

export default App;
