import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PupilWorkspace from "./pages/PupilWorkspace";
import TeacherConsole from "./pages/TeacherConsole";
import ShellLayout from "./components/ShellLayout";

const App = () => {
  return (
    <ShellLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pupil/*" element={<PupilWorkspace />} />
        <Route path="/teacher/*" element={<TeacherConsole />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ShellLayout>
  );
};

export default App;
