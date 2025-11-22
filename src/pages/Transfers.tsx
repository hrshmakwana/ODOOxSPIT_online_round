import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Transfers() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // Form
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    // Simple fetch to avoid FK errors
    const { data: tData } = await supabase.from("transfers").select("*").order('created_at', { ascending: false });
    const { data: wData } = await supabase.from("warehouses").select("*");
    
    // Manual Join in JS to be safe against Supabase relationship errors
    const enrichedTransfers = tData?.map(t => ({
        ...t,
        from_name: wData?.find(w => w.id === t.from_warehouse_id)?.name,
        to_name: wData?.find(w => w.id === t.to_warehouse_id)?.name,
    }));

    setTransfers(enrichedTransfers || []);
    setWarehouses(wData || []);
  };

  const createTransfer = async () => {
    if (!fromId || !toId) {
        toast.error("Select both warehouses");
        return;
    }
    if (fromId === toId) {
        toast.error("Cannot transfer to the same warehouse");
        return;
    }
    
    const { error } = await supabase.from("transfers").insert({
        transfer_number: `TR-${Math.floor(Math.random() * 10000)}`,
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        status: 'done'
    });

    if (error) {
        toast.error("Failed to transfer");
    } else {
        toast.success("Transfer Recorded!");
        setOpen(false);
        setFromId("");
        setToId("");
        fetchTransfers();
    }
  };

  const deleteTransfer = async (id: string) => {
    if (!confirm("Delete this transfer record?")) return;
    const { error } = await supabase.from("transfers").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
        toast.success("Transfer deleted");
        fetchTransfers();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Internal Transfers</h1>
            <p className="text-muted-foreground">Move stock between locations.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-blue-600"><Plus className="mr-2 h-4 w-4"/> New Transfer</Button></DialogTrigger>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader><DialogTitle>Move Stock</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">From Source</label>
                    <Select value={fromId} onValueChange={setFromId}>
                        <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">To Destination</label>
                    <Select value={toId} onValueChange={setToId}>
                        <SelectTrigger><SelectValue placeholder="Select Destination" /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={createTransfer} className="w-full">Confirm Transfer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden glass-card">
        <Table>
          <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transfers recorded.</TableCell></TableRow>
            ) : transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-primary">{t.transfer_number}</TableCell>
                <TableCell>{t.from_name || "Unknown"}</TableCell>
                <TableCell>{t.to_name || "Unknown"}</TableCell>
                <TableCell><Badge className="bg-green-500/10 text-green-600 border-0">Completed</Badge></TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteTransfer(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}