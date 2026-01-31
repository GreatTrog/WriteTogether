import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useTeacherStore, type SharedFileRecord } from "../../store/useTeacherStore";
import { getSharedFileBlob } from "../../services/sharedFileStorage";

const SharedFilesPanel = () => {
  const linkButtonStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    cursor: "pointer",
  };
  const sharedFiles = useTeacherStore((state) => state.sharedFiles);
  const [query, setQuery] = useState("");

  const filteredFiles = useMemo(() => {
    const search = query.trim().toLowerCase();
    const sorted = [...sharedFiles].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    if (!search) {
      return sorted;
    }
    return sorted.filter((file) => {
      const dateLabel = new Date(file.savedAt).toLocaleDateString();
      return (
        file.filename.toLowerCase().includes(search) ||
        file.username.toLowerCase().includes(search) ||
        dateLabel.toLowerCase().includes(search)
      );
    });
  }, [sharedFiles, query]);

  const openSharedFile = useCallback(async (file: SharedFileRecord) => {
    try {
      if (!file.storageKey) {
        window.alert(
          "This shared file is no longer stored locally. Ask the pupil to re-export it.",
        );
        return;
      }
      const blob = await getSharedFileBlob(file.storageKey);
      if (!blob) {
        window.alert(
          "We couldn't locate the PDF. Ask the pupil to re-export it.",
        );
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const popup = window.open(objectUrl, "_blank", "noopener");
      if (!popup) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = file.filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (error) {
      console.error(error);
      window.alert("Unable to open the shared file. Please re-export from the pupil workspace.");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="shared-files-search"
        >
          Search shared files
        </label>
        <input
          id="shared-files-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by filename, username, or date"
          className="flex-1 min-w-[220px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {filteredFiles.length} file{filteredFiles.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          No shared files yet. Ask pupils to export from Mode 2 to populate this list.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Filename
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Username
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Saved
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Location
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Size
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.map((file) => {
                const savedAt = new Date(file.savedAt);
                const sizeKb = Math.max(1, Math.round(file.sizeBytes / 1024));
                const canOpen = Boolean(file.storageKey);
                return (
                  <tr key={file.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => openSharedFile(file)}
                          className="text-left text-sky-600 hover:underline"
                          style={linkButtonStyle}
                        >
                          {file.filename}
                        </button>
                      ) : (
                        <span>{file.filename}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{file.username}</td>
                    <td className="px-4 py-3">
                      <div>{savedAt.toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">
                        {savedAt.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">{file.location}</td>
                    <td className="px-4 py-3">{sizeKb} KB</td>
                    <td className="px-4 py-3">
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => openSharedFile(file)}
                          className="text-sky-600 hover:underline"
                          style={linkButtonStyle}
                        >
                          Open
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Unavailable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SharedFilesPanel;
