"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Factory, FileCog } from "lucide-react";

type Product = { id: string; name: string; sku: string | null };
type Warehouse = { id: string; name: string };
type BOM = {
  id: string; code: string; version: string; product_id: string;
  output_qty: number; labour_cost: number; overhead_cost: number;
  products?: { name: string; sku: string | null } | null;
};
type WO = {
  id: string; wo_number: string; product_id: string;
  planned_qty: number; produced_qty: number | null; status: string;
  products?: { name: string; sku: string | null } | null;
  warehouses?: { name: string } | null;
};

type BOMItem = { component_id: string; quantity: number; uom: string; scrap_pct: number };

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export function ManufacturingClient({
  boms: initialBoms, workOrders: initialWO, products, warehouses,
}: {
  boms: BOM[]; workOrders: WO[]; products: Product[]; warehouses: Warehouse[];
}) {
  const [boms, setBoms] = useState<BOM[]>(initialBoms);
  const [wos, setWos] = useState<WO[]>(initialWO);
  const [openBom, setOpenBom] = useState(false);
  const [openWO, setOpenWO] = useState(false);
  const [busy, setBusy] = useState(false);

  const [bomForm, setBomForm] = useState({
    product_id: "", code: "", version: "v1",
    output_qty: 1, labour_cost: 0, overhead_cost: 0, notes: "",
  });
  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { component_id: "", quantity: 1, uom: "pcs", scrap_pct: 0 },
  ]);

  const [woForm, setWoForm] = useState({
    product_id: "", bom_id: "", warehouse_id: "",
    planned_qty: 1, planned_start: "", planned_end: "", notes: "",
  });

  function updateBomItem(idx: number, patch: Partial<BOMItem>) {
    setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function saveBom() {
    setBusy(true);
    try {
      const payload = { ...bomForm, items: bomItems.filter((i) => i.component_id) };
      const res = await fetch("/api/bom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const prod = products.find((p) => p.id === bomForm.product_id);
      setBoms((prev) => [{ ...json.data, products: prod ? { name: prod.name, sku: prod.sku } : null }, ...prev]);
      setOpenBom(false);
      setBomForm({ product_id: "", code: "", version: "v1", output_qty: 1, labour_cost: 0, overhead_cost: 0, notes: "" });
      setBomItems([{ component_id: "", quantity: 1, uom: "pcs", scrap_pct: 0 }]);
    } finally { setBusy(false); }
  }

  async function saveWO() {
    setBusy(true);
    try {
      const payload = {
        ...woForm,
        bom_id: woForm.bom_id || null,
        warehouse_id: woForm.warehouse_id || null,
        planned_start: woForm.planned_start || null,
        planned_end: woForm.planned_end || null,
        notes: woForm.notes || null,
      };
      const res = await fetch("/api/work-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const prod = products.find((p) => p.id === woForm.product_id);
      const wh = warehouses.find((w) => w.id === woForm.warehouse_id);
      setWos((prev) => [{
        ...json.data,
        products: prod ? { name: prod.name, sku: prod.sku } : null,
        warehouses: wh ? { name: wh.name } : null,
      }, ...prev]);
      setOpenWO(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manufacturing</h1>
        <p className="text-sm text-slate-500 mt-1">Bill of materials, work orders and shop floor</p>
      </div>

      <Tabs defaultValue="wo">
        <TabsList>
          <TabsTrigger value="wo"><Factory className="h-4 w-4 mr-1" /> Work Orders</TabsTrigger>
          <TabsTrigger value="bom"><FileCog className="h-4 w-4 mr-1" /> BOM</TabsTrigger>
        </TabsList>

        <TabsContent value="wo" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={openWO} onOpenChange={setOpenWO}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Work Order</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Product</Label>
                    <Select value={woForm.product_id} onValueChange={(v) => setWoForm({ ...woForm, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>BOM (optional)</Label>
                    <Select value={woForm.bom_id} onValueChange={(v) => setWoForm({ ...woForm, bom_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Link a BOM" /></SelectTrigger>
                      <SelectContent>
                        {boms.filter((b) => !woForm.product_id || b.product_id === woForm.product_id)
                          .map((b) => <SelectItem key={b.id} value={b.id}>{b.code} · {b.version}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Warehouse</Label>
                    <Select value={woForm.warehouse_id} onValueChange={(v) => setWoForm({ ...woForm, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Planned Qty</Label>
                    <Input type="number" min="0" step="0.01" value={woForm.planned_qty}
                      onChange={(e) => setWoForm({ ...woForm, planned_qty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Planned Start</Label>
                    <Input type="date" value={woForm.planned_start} onChange={(e) => setWoForm({ ...woForm, planned_start: e.target.value })} />
                  </div>
                  <div>
                    <Label>Planned End</Label>
                    <Input type="date" value={woForm.planned_end} onChange={(e) => setWoForm({ ...woForm, planned_end: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={woForm.notes} onChange={(e) => setWoForm({ ...woForm, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpenWO(false)}>Cancel</Button>
                  <Button onClick={saveWO} disabled={busy || !woForm.product_id}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Produced</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wos.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500">No work orders.</TableCell></TableRow>
                ) : wos.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.wo_number}</TableCell>
                    <TableCell>{w.products?.name ?? "—"}</TableCell>
                    <TableCell>{w.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{w.planned_qty}</TableCell>
                    <TableCell className="text-right">{w.produced_qty ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLOR[w.status] ?? ""} capitalize border-0`}>{w.status.replace("_", " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="bom" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={openBom} onOpenChange={setOpenBom}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New BOM</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New Bill of Materials</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Finished Product</Label>
                    <Select value={bomForm.product_id} onValueChange={(v) => setBomForm({ ...bomForm, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>BOM Code</Label><Input value={bomForm.code} onChange={(e) => setBomForm({ ...bomForm, code: e.target.value })} /></div>
                  <div><Label>Version</Label><Input value={bomForm.version} onChange={(e) => setBomForm({ ...bomForm, version: e.target.value })} /></div>
                  <div><Label>Output Qty</Label><Input type="number" min="0" step="0.01" value={bomForm.output_qty} onChange={(e) => setBomForm({ ...bomForm, output_qty: Number(e.target.value) })} /></div>
                  <div><Label>Labour Cost</Label><Input type="number" min="0" value={bomForm.labour_cost} onChange={(e) => setBomForm({ ...bomForm, labour_cost: Number(e.target.value) })} /></div>
                  <div><Label>Overhead Cost</Label><Input type="number" min="0" value={bomForm.overhead_cost} onChange={(e) => setBomForm({ ...bomForm, overhead_cost: Number(e.target.value) })} /></div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Components</Label>
                    <Button size="sm" variant="outline" onClick={() => setBomItems((prev) => [...prev, { component_id: "", quantity: 1, uom: "pcs", scrap_pct: 0 }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {bomItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-end">
                      <Select value={it.component_id} onValueChange={(v) => updateBomItem(idx, { component_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Component" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => updateBomItem(idx, { quantity: Number(e.target.value) })} />
                      <Input placeholder="UoM" value={it.uom} onChange={(e) => updateBomItem(idx, { uom: e.target.value })} />
                      <Input type="number" step="0.1" placeholder="Scrap%" value={it.scrap_pct} onChange={(e) => updateBomItem(idx, { scrap_pct: Number(e.target.value) })} />
                      <Button size="icon" variant="ghost" onClick={() => setBomItems((prev) => prev.filter((_, i) => i !== idx))} disabled={bomItems.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpenBom(false)}>Cancel</Button>
                  <Button onClick={saveBom} disabled={busy || !bomForm.product_id || !bomForm.code}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Labour</TableHead>
                  <TableHead className="text-right">Overhead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boms.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500">No BOMs defined.</TableCell></TableRow>
                ) : boms.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell>{b.products?.name ?? "—"}</TableCell>
                    <TableCell>{b.version}</TableCell>
                    <TableCell className="text-right">{b.output_qty}</TableCell>
                    <TableCell className="text-right">{Number(b.labour_cost).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(b.overhead_cost).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
