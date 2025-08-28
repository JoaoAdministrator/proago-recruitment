// Settings.jsx — Proago CRM (Final Sync Build v2025-08-28h)
// - Projects list editable
// - Conversion matrix editable (D2D + Events, Discount/No Discount, Box2/Box4)
// - Hourly rate bands editable (date + rate)
// - Safe typing (no one-letter bug)
// - Save / Reset to defaults

import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, X } from "lucide-react";
import { DEFAULT_SETTINGS, save, K, passthrough, normalizeNumericOnBlur } from "../util";

export default function Settings({ settings, setSettings }) {
  // Local working copy (avoid flicker while typing)
  const [local, setLocal] = useState(settings || DEFAULT_SETTINGS);

  useEffect(() => setLocal(settings || DEFAULT_SETTINGS), [settings]);

  /* -------------------- Projects -------------------- */
  const setProjectName = (idx, name) =>
    setLocal((s) => {
      const projects = [...(s.projects || [])];
      projects[idx] = name;
      return { ...s, projects };
    });

  const addProject = () =>
    setLocal((s) => ({ ...s, projects: [...(s.projects || []), `Project ${s.projects.length + 1}`] }));

  const delProject = (idx) =>
    setLocal((s) => ({ ...s, projects: (s.projects || []).filter((_, i) => i !== idx) }));

  /* -------------------- Conversion Matrix -------------------- */
  const setMatrix = (type, tier, field, val) =>
    setLocal((s) => ({
      ...s,
      conversionType: {
        ...(s.conversionType || DEFAULT_SETTINGS.conversionType),
        [type]: {
          ...(s.conversionType?.[type] || DEFAULT_SETTINGS.conversionType[type]),
          [tier]: {
            ...(s.conversionType?.[type]?.[tier] || DEFAULT_SETTINGS.conversionType[type][tier]),
            [field]: Number(val) || 0,
          },
        },
      },
    }));

  /* -------------------- Rate Bands -------------------- */
  const addBand = () =>
    setLocal((s) => ({
      ...s,
      rateBands: [
        ...(s.rateBands || []),
        { startISO: new Date().toISOString().slice(0, 10), rate: 16 },
      ],
    }));

  const setBand = (idx, patch) =>
    setLocal((s) => {
      const bands = [...(s.rateBands || [])];
      bands[idx] = { ...bands[idx], ...patch };
      return { ...s, rateBands: bands };
    });

  const delBand = (idx) =>
    setLocal((s) => ({ ...s, rateBands: (s.rateBands || []).filter((_, i) => i !== idx) }));

  /* -------------------- Actions -------------------- */
  const onSave = () => {
    setSettings(local);
    save(K.settings, local);
    alert("Settings saved");
  };

  const onReset = () => setLocal(settings || DEFAULT_SETTINGS);

  const types = [
    { key: "D2D", label: "Door-to-Door" },
    { key: "EVENT", label: "Events" },
  ];
  const tiers = [
    { key: "noDiscount", label: "No Discount" },
    { key: "discount", label: "Discount" },
  ];

  return (
    <div className="grid gap-4">
      <h3 className="font-semibold">Settings</h3>

      {/* Projects */}
      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(local.projects || []).map((p, i) => (
              <div key={i} className="flex items-center gap-2 border rounded-full px-3 py-1">
                <Input
                  className="h-8"
                  value={p}
                  onChange={(e) => setProjectName(i, e.target.value)}
                  placeholder="Project name"
                />
                <Button variant="ghost" size="sm" onClick={() => delProject(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addProject}>
              <Plus className="h-4 w-4 mr-1" />
              Add Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Matrix */}
      <Card>
        <CardHeader><CardTitle>Conversion Matrix</CardTitle></CardHeader>
        <CardContent>
          {types.map((t) => (
            <div key={t.key} className="mb-4">
              <div className="font-medium mb-2">{t.label}</div>
              <div className="grid md:grid-cols-2 gap-3">
                {tiers.map((tier) => (
                  <div key={tier.key} className="border rounded-lg p-3">
                    <div className="text-sm text-zinc-600 mb-2">{tier.label}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Box2 €</Label>
                        <Input
                          inputMode="decimal"
                          value={
                            local.conversionType?.[t.key]?.[tier.key]?.box2 ??
                            DEFAULT_SETTINGS.conversionType[t.key][tier.key].box2
                          }
                          onChange={(e) =>
                            setMatrix(t.key, tier.key, "box2", e.target.value)
                          }
                          onBlur={(e) =>
                            setMatrix(t.key, tier.key, "box2", normalizeNumericOnBlur(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <Label>Box4 €</Label>
                        <Input
                          inputMode="decimal"
                          value={
                            local.conversionType?.[t.key]?.[tier.key]?.box4 ??
                            DEFAULT_SETTINGS.conversionType[t.key][tier.key].box4
                          }
                          onChange={(e) =>
                            setMatrix(t.key, tier.key, "box4", e.target.value)
                          }
                          onBlur={(e) =>
                            setMatrix(t.key, tier.key, "box4", normalizeNumericOnBlur(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hourly Rate Bands */}
      <Card>
        <CardHeader><CardTitle>Hourly Rate Bands</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {[...(local.rateBands || [])]
              .sort((a, b) => (a.startISO < b.startISO ? 1 : -1)) // newest first
              .map((band, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={band.startISO}
                      onChange={(e) => setBand(i, { startISO: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Rate €</Label>
                    <Input
                      inputMode="decimal"
                      value={band.rate}
                      onChange={(e) => setBand(i, { rate: e.target.value })}
                      onBlur={(e) => setBand(i, { rate: normalizeNumericOnBlur(e.target.value) })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => delBand(i)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            <div>
              <Button variant="outline" onClick={addBand}>
                <Plus className="h-4 w-4 mr-1" />
                Add Band
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>Reset</Button>
        <Button style={{ background: "#d9010b", color: "white" }} onClick={onSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
