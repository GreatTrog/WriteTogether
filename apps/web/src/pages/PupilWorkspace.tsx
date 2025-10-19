import { Route, Routes } from "react-router-dom";
import ModeOneBuilder from "../sections/mode-one/ModeOneBuilder";
import ModeTwoWorkspace from "../sections/mode-two/ModeTwoWorkspace";

const PupilWorkspace = () => {
  // Presents either scaffold depending on the selected mode path.
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex overflow-hidden rounded-2xl">
        <Routes>
          <Route
            index
            element={
              <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-600">
                <p>Select a mode from the navigation above to start writing.</p>
              </div>
            }
          />
          <Route path="mode-one" element={<ModeOneBuilder />} />
          <Route path="mode-two" element={<ModeTwoWorkspace />} />
        </Routes>
      </div>
    </div>
  );
};

export default PupilWorkspace;
