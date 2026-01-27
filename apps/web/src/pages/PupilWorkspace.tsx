import { Link, Route, Routes } from "react-router-dom";
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
              <div className="flex h-full w-full flex-col gap-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
                <div className="text-center text-sm text-slate-600">
                  Select a mode below to start writing.
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    to="/pupil/mode-one"
                    className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <h2 className="text-lg font-semibold text-slate-900">
                      Mode 1: Colourful Semantics
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Sentence-building scaffolds that guide pupils through who,
                      what, where, and how details.
                    </p>
                  </Link>
                  <Link
                    to="/pupil/mode-two"
                    className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <h2 className="text-lg font-semibold text-slate-900">
                      Mode 2: Click-to-Compose
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Mix and match prompts to build sentences quickly with
                      structured choices.
                    </p>
                  </Link>
                </div>
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
