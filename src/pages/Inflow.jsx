// Inflow.jsx
// Proago CRM component (updated build v2025-08-28 with Chat 9 changes)

import React, { useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Upload, Trash2, Plus, UserPlus } from "lucide-react";
import { titleCase, formatPhoneByCountry, clone } from "../util";

const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Indeed");
  const [calls, setCalls] = useState(0);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setSource("Indeed");
    setCalls(0);
  };

  const normalized = phone ? formatPhoneByCountry(phone) : { display: "", flag: "", ok: false };
  return (
    <Dialog open={open} onOpenChange={(v) => { reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Calls (0–3)</Label>
            <Input type="number" min="0" max="3" value={calls} onChange={(e) => setCalls(Number(e.target.value))} />
          </div>
          <div className="grid gap-1">
            <Label>Source</Label>
            <select className="h-10 border rounded-md px-2" value={source} onChange={(e) => setSource(e.target.value)}>
              <option>Indeed</option>
              <option>Street</option>
              <option>Referral</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button style={{ background: "#d9010b", color: "white" }}
            onClick={() => {
              const nm = titleCase(name);
              if (!nm) return alert("Name required");
              const norm = formatPhoneByCountry(phone);
              if (!norm.ok) return alert("Phone must start with +352, +33, +32 or +49.");
              const lead = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
                name: nm,
                phone: norm.display,
                email: email.trim(),
                source: source.trim(),
                flag: norm.flag,
                calls,
                date: "",
                time: ""
              };
              onSave(lead);
              onOpenChange(false);
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Inflow({ pipeline, setPipeline, onHire }) {
  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);

  const move = (item, from, to) => {
    const next = clone(pipeline);
    next[from] = next[from].filter((x) => x.id !== item.id);
    next[to].push(item);
    setPipeline(next);
  };

  const del = (item, from) => {
    if (!confirm("Delete?")) return;
    const next = clone(pipeline);
    next[from] = next[from].filter((x) => x.id !== item.id);
    setPipeline(next);
  };

  const hire = (item) => {
    let code = prompt("Crewcode (5 digits):");
    if (!code) return;
    code = String(code).trim();
    if (!/^\d{5}$/.test(code)) {
      alert("Crewcode must be exactly 5 digits.");
      return;
    }
    onHire({ ...item, crewCode: code, role: "Rookie" });
    const next = clone(pipeline);
    next.formation = next.formation.filter((x) => x.id !== item.id);
    setPipeline(next);
  };

  // Section layout
  const Section = ({ title, keyName, prev, nextKey, extra }) => (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <Badge>{pipeline[keyName].length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Email</th>
                {keyName === "leads" && <th className="p-3">Calls</th>}
                <th className="p-3">Source</th>
                {keyName !== "leads" && <th className="p-3">Date</th>}
                {keyName !== "leads" && <th className="p-3">Time</th>}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline[keyName].map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{titleCase(x.name)}</td>
                  <td className="p-3">{x.flag} {x.phone}</td>
                  <td className="p-3">
                    <Input value={x.email || ""}
                      onChange={(e) =>
                        setPipeline((p) => ({
                          ...p,
                          [keyName]: p[keyName].map((it) =>
                            it.id === x.id ? { ...it, email: e.target.value } : it
                          )
                        }))
                      }
                    />
                  </td>
                  {keyName === "leads" && <td className="p-3">{x.calls ?? 0}</td>}
                  <td className="p-3">{x.source}</td>
                  {keyName !== "leads" && (
                    <>
                      <td className="p-3">
                        <Input type="date" value={x.date || ""}
                          onChange={(e) =>
                            setPipeline((p) => ({
                              ...p,
                              [keyName]: p[keyName].map((it) =>
                                it.id === x.id ? { ...it, date: e.target.value } : it
                              )
                            }))
                          }
                        />
                      </td>
                      <td className="p-3">
                        <Input type="time" value={x.time || ""}
                          onChange={(e) =>
                            setPipeline((p) => ({
                              ...p,
                              [keyName]: p[keyName].map((it) =>
                                it.id === x.id ? { ...it, time: e.target.value } : it
                              )
                            }))
                          }
                        />
                      </td>
                    </>
                  )}
                  <td className="p-3 flex gap-2 justify-end">
                    {prev && (
                      <Button size="sm" variant="outline" style={{ background: "#fca11c", color: "black" }}
                        onClick={() => move(x, keyName, prev)}>Back</Button>
                    )}
                    {nextKey && (
                      <Button size="sm" style={{ background: "#fca11c", color: "black" }}
                        onClick={() => move(x, keyName, nextKey)}>Move →</Button>
                    )}
                    {extra && extra(x)}
                    <Button size="sm" variant="outline"
                      onClick={() => alert("Edit / Info feature coming soon")}>Info</Button>
                    <Button size="sm" variant="destructive" onClick={() => del(x, keyName)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Inflow</h3>
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />Import
          </Button>
          <input ref={fileRef} type="file" hidden accept="application/json" />
          <Button style={{ background: "#d9010b", color: "white" }} onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Lead
          </Button>
        </div>
      </div>

      {/* Sections */}
      <Section title="Leads" keyName="leads" nextKey="interview" />
      <Section title="Interview" keyName="interview" prev="leads" nextKey="formation" />
      <Section
        title="Formation"
        keyName="formation"
        prev="interview"
        extra={(x) => (
          <Button size="sm" onClick={() => hire(x)}>
            <UserPlus className="h-4 w-4 mr-1" />Hire
          </Button>
        )}
      />

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen}
        onSave={(lead) => setPipeline((p) => ({ ...p, leads: [lead, ...p.leads] }))} />
    </div>
  );
}
