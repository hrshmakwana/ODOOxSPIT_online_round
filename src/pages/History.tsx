import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History as HistoryIcon } from "lucide-react";

export default function History() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function getLogs() {
      // Fetch logs and join with product names
      const { data } = await supabase
        .from("stock_ledger")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      
      setLogs(data || []);
    }
    getLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HistoryIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Stock History Ledger</h1>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Change</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4">No history yet.</TableCell></TableRow>
                ) : logs.map((log) => (
                <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{log.products?.name || "Unknown Product"}</TableCell>
                    <TableCell className="capitalize">{log.transaction_type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{log.reference_number}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${Number(log.quantity_change) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(log.quantity_change) > 0 ? '+' : ''}{log.quantity_change}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}