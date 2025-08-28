// Recruiters.jsx — Rank everywhere, centered headers, Info = same size as Edit Day, email typing fix, deactivate black/white (v2025-08-28d)

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { MODAL_SIZES, titleCaseFirstOnBlur, passthrough, emailOnChange } from "../util";
import { Info } from "lucide-react";

const headers = [
  { key: "name", label: "Name" },
  { key: "crewcode", label: "Crewcode" },
  { key: "rank", label: "Rank" },
  { key: "average", label: "Average" },
  { key: "box2", label: "Box2" },
  { key: "box4", label: "Box4" },
  { key: "actions", label: "Actions" },
];

export default function Recruiters({ data, setData }) {
  const [query, setQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [r.name, r.crewcode, r.rank].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [data, query]);

  const openInfo = (id) => {
    setSelectedId(id);
    setInfoOpen(true);
  };
  const sel = useMemo(() => filtered.find((r) => r.id === selectedId) || null, [filtered, selectedId]);

  const updateField = (id, key, value) => {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recruiters</CardTitle>
          <Input
            placeholder="Search by Name / Crewcode / Rank"
            value={query}
            onChange={passthrough(setQuery)}
            onBlur={(e) => setQuery(titleCaseFirstOnBlur(e.target.value))}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h.key} className="px-3 py-2 text-center text-xs text-gray-600">
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-center">
                      <Input
                        value={r.name || ""}
                        onChange={(e) => updateField(r.id, "name", e.target.value)}
                        onBlur={(e) => updateField(r.id, "name", titleCaseFirstOnBlur(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">{r.crewcode}</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        value={r.rank || ""}
                        onChange={(e) => updateField(r.id, "rank", e.target.value)}
                        onBlur={(e) => updateField(r.id, "rank", titleCaseFirstOnBlur(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">{Number(r.average ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{Number(r.box2 ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{Number(r.box4 ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center space-x-2">
                      <Button variant="secondary" onClick={() => openInfo(r.id)}>
                        <Info className="h-4 w-4 mr-1" /> Info
                      </Button>
                      <Button className="bg-black text-white hover:opacity-80" onClick={() => updateField(r.id, "active", false)}>
                        Deactivate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* INFO — same enlarged workbench as Edit Day */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className={`${MODAL_SIZES.workbench.className}`}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
              <DialogTitle>Recruiter Info</DialogTitle>
            </DialogHeader>
            {!sel ? (
              <div className="p-6 text-center text-gray-500">No recruiter selected.</div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <label className="text-xs text-gray-600">Name</label>
                    <Input
                      value={sel.name || ""}
                      onChange={(e) => updateField(sel.id, "name", e.target.value)}
                      onBlur={(e) => updateField(sel.id, "name", titleCaseFirstOnBlur(e.target.value))}
                    />
                    <label className="text-xs text-gray-600">Crewcode</label>
                    <Input value={sel.crewcode || ""} onChange={(e) => updateField(sel.id, "crewcode", e.target.value)} />
                    <label className="text-xs text-gray-600">Rank</label>
                    <Input
                      value={sel.rank || ""}
                      onChange={(e) => updateField(sel.id, "rank", e.target.value)}
                      onBlur={(e) => updateField(sel.id, "rank", titleCaseFirstOnBlur(e.target.value))}
                    />
                    <label className="text-xs text-gray-600">Email</label>
                    <Input
                      type="email"
                      value={sel.email || ""}
                      onChange={(e) => updateField(sel.id, "email", e.target.value)} // no formatting while typing
                      onBlur={(e) => updateField(sel.id, "email", e.target.value.trim())}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <Metric label="Average" value={sel.average} />
                    <Metric label="Box2" value={sel.box2} />
                    <Metric label="Box4" value={sel.box4} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold">{Number(value ?? 0).toFixed(2)}</div>
    </div>
  );
}
