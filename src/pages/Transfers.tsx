import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

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
        fetchTransfers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Internal Transfers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> New Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Move Stock</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label>From</label>
                    <Select onValueChange={setFromId}>
                        <SelectTrigger><SelectValue placeholder="Source Warehouse" /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label>To</label>
                    <Select onValueChange={setToId}>
                        <SelectTrigger><SelectValue placeholder="Destination Warehouse" /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={createTransfer} className="w-full">Create Transfer Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono">{t.transfer_number}</TableCell>
                <TableCell>{t.from_name || "Unknown"}</TableCell>
                <TableCell>{t.to_name || "Unknown"}</TableCell>
                <TableCell><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Done</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}