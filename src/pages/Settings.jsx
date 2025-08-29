// pages/Settings.jsx
// Proago CRM — Projects show "Hello Fresh", conversion labels without parentheses, remove € signs from labels,
// Delete Planning History now wipes recruiters + history (and confirms), no duplicate Settings button here (handled in App)

import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { load, save, K, DEFAULT_SETTINGS, clone } from "../util";

export default function Settings({ settings, setSettings }) {
  const s = settings || DEFAULT_SETTINGS;

  const onChangeRate = (i, field, value) => {
    setSettings((prev) => {
      const next = clone(prev);
      next.rateBands[i][field] = field === "rate" ? Number(value || 0) : value;
      return next;
    });
  };

  const addRateBand = () => {
    setSettings((prev) => {
      const next = clone(prev);
      next.rateBands.push({ startISO: "2026-01-01", rate: 16 });
      return next;
    });
  };

  const changeProjectName = (idx, val) => {
    setSettings((prev) => {
      const next = clone(prev);
      next.projects[idx] = val;
      return next;
    });
  };

  const deleteAllData = () => {
    if (!confirm("Delete ALL recruiters and ALL planning history? This cannot be undone.")) return;
    try {
      localStorage.removeItem(K.history);
      localStorage.removeItem(K.recruiters);
      alert("All recruiters and planning history deleted.");
      // (Optionally) force a reload so UI updates everywhere
      // window.location.reload();
    } catch {
      alert("Failed to delete data.");
    }
  };

  return (
    <div className="grid gap-4">
      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(s.projects || []).map((p, i) => (
            <div key={i} className="grid gap-1">
              <Label>Project {i + 1}</Label>
              <Input value={p} onChange={(e) => changeProjectName(i, e.target.value)} />
            </div>
          ))}
          {(!s.projects || s.projects.length === 0) && (
            <div className="text-sm text-muted-foreground">Default project: Hello Fresh</div>
          )}
        </CardContent>
      </Card>

      {/* Conversion matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Matrix</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Door-to-Door — No Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2</Label>
                  <Input inputMode="numeric" value={s.conversionType.D2D.noDiscount.box2}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, D2D:{ ...prev.conversionType.D2D, noDiscount:{ ...prev.conversionType.D2D.noDiscount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input inputMode="numeric" value={s.conversionType.D2D.noDiscount.box4}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, D2D:{ ...prev.conversionType.D2D, noDiscount:{ ...prev.conversionType.D2D.noDiscount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Door-to-Door — Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input inputMode="numeric" value={s.conversionType.D2D.discount.box2}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, D2D:{ ...prev.conversionType.D2D, discount:{ ...prev.conversionType.D2D.discount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input inputMode="numeric" value={s.conversionType.D2D.discount.box4}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, D2D:{ ...prev.conversionType.D2D, discount:{ ...prev.conversionType.D2D.discount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Events — No Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2</Label>
                  <Input inputMode="numeric" value={s.conversionType.EVENT.noDiscount.box2}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, EVENT:{ ...prev.conversionType.EVENT, noDiscount:{ ...prev.conversionType.EVENT.noDiscount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input inputMode="numeric" value={s.conversionType.EVENT.noDiscount.box4}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, EVENT:{ ...prev.conversionType.EVENT, noDiscount:{ ...prev.conversionType.EVENT.noDiscount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Events — Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input inputMode="numeric" value={s.conversionType.EVENT.discount.box2}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, EVENT:{ ...prev.conversionType.EVENT, discount:{ ...prev.conversionType.EVENT.discount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input inputMode="numeric" value={s.conversionType.EVENT.discount.box4}
                    onChange={(e)=> setSettings(prev=>({ ...prev, conversionType:{ ...prev.conversionType, EVENT:{ ...prev.conversionType.EVENT, discount:{ ...prev.conversionType.EVENT.discount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Rate Bands */}
      <Card>
        <CardHeader><CardTitle>Hourly Rate Bands</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {s.rateBands.map((b, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="grid gap-1">
                <Label>Start Date</Label>
                <Input type="date" value={b.startISO} onChange={(e)=>onChangeRate(i,"startISO",e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Rate (€)</Label>
                <Input inputMode="numeric" value={b.rate} onChange={(e)=>onChangeRate(i,"rate",e.target.value)} />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRateBand}>Add Rate Band</Button>
        </CardContent>
      </Card>

      {/* Dangerous action */}
      <div className="flex justify-end">
        <Button variant="destructive" onClick={deleteAllData}>
          Delete Planning History & Recruiters
        </Button>
      </div>
    </div>
  );
}
