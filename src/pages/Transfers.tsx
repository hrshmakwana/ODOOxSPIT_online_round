import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Transfers = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from("transfers")
        .select("*, from_warehouse:warehouses!transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!transfers_to_warehouse_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch transfers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Transfers</h1>
          <p className="text-muted-foreground">Manage internal stock transfers</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-glass">
          <Plus className="mr-2 h-4 w-4" />New Transfer
        </Button>
      </div>
      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead>Transfer #</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transfers found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Transfers;
