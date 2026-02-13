import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Sparkles, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PlasticButton } from "@/components/ui/plastic-button";
import ReactMarkdown from "react-markdown";
import type { DateRange } from "react-day-picker";

interface ItemSummary {
  item: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

export default function OrderAnalysis() {
  const [mode, setMode] = useState<"single" | "range" | "order">("single");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [singleDate, setSingleDate] = useState<Date | undefined>(new Date());
  const [startOrder, setStartOrder] = useState("");
  const [endOrder, setEndOrder] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [summary, setSummary] = useState<ItemSummary[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);

  const handleAnalyze = async () => {
    let body: any = {};

    if (mode === "single") {
      if (!singleDate) {
        toast.error("Please select a date first");
        return;
      }
      body = { startDate: format(singleDate, "yyyy-MM-dd"), endDate: format(singleDate, "yyyy-MM-dd") };
    } else if (mode === "range") {
      if (!dateRange?.from) {
        toast.error("Please select a date range first");
        return;
      }
      body = {
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd")
      };
    } else {
      if (!startOrder || !endOrder) {
        toast.error("Please enter both start and end order numbers");
        return;
      }
      body = { startOrder, endOrder };
    }

    setLoading(true);
    setAnalysis(null);
    setSummary([]);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-orders", {
        body,
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      setSummary(data.summary || []);
      setTotalOrders(data.totalOrders || 0);
    } catch (error: any) {
      console.error("Analysis error:", error);
      const message = error?.message || "Failed to analyze orders";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = () => {
    if (mode === "single") {
      return singleDate ? format(singleDate, "PPP") : "Pick a date";
    }
    if (mode === "range") {
      if (!dateRange?.from) return "Pick a date range";
      if (!dateRange.to) return format(dateRange.from, "PPP");
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    return "";
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card/90 backdrop-blur-md px-8 h-14">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">AI Analysis</span>
        </div>
      </header>

      <div className="px-8 py-8 space-y-8">
        <div>
          <h1 className="!text-2xl !font-semibold tracking-tight">Order Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered order breakdown and item summary
          </p>
        </div>

        {/* Controls */}
        <div className="swiss-card p-6">
          <div className="flex flex-col gap-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "range" | "order")} className="w-full">
              <TabsList className="grid w-full max-w-[600px] grid-cols-3">
                <TabsTrigger value="single">Single Day</TabsTrigger>
                <TabsTrigger value="range">Date Range</TabsTrigger>
                <TabsTrigger value="order">Order Range</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-end gap-4">
              {mode === "order" ? (
                <>
                  <div className="space-y-2 flex-1 max-w-[200px]">
                    <label className="text-sm font-medium text-foreground">From Order #</label>
                    <Input
                      placeholder="e.g. 1001"
                      value={startOrder}
                      onChange={(e) => setStartOrder(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2 flex-1 max-w-[200px]">
                    <label className="text-sm font-medium text-foreground">To Order #</label>
                    <Input
                      placeholder="e.g. 1020"
                      value={endOrder}
                      onChange={(e) => setEndOrder(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {mode === "single" ? "Select Day" : "Date Range"}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          mode === "single" ? !singleDate && "text-muted-foreground" : !dateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getLabel()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {mode === "single" ? (
                        <Calendar
                          mode="single"
                          selected={singleDate}
                          onSelect={setSingleDate}
                          disabled={(d) => d > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      ) : (
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                          disabled={(d) => d > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <PlasticButton
                text="Analyze"
                onClick={handleAnalyze}
                loading={loading}
                disabled={(mode === "single" ? !singleDate : mode === "range" ? !dateRange?.from : (!startOrder || !endOrder))}
              />
            </div>
          </div>
        </div>

        {/* Item Summary Table */}
        {summary.length > 0 && (
          <div className="swiss-card-elevated overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h2 className="text-base font-semibold tracking-tight">Item Summary</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalOrders} orders · {summary.length} unique items
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-center px-6 py-3 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-center px-6 py-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{s.item}</span>
                      </td>
                      <td className="text-center px-6 py-3 tabular-nums font-semibold">{s.quantity}</td>
                      <td className="text-center px-6 py-3 tabular-nums text-muted-foreground">{s.orderCount}</td>
                      <td className="text-right px-6 py-3 tabular-nums">৳{s.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {analysis && (
          <div className="swiss-card-elevated overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">AI Analysis</h2>
            </div>
            <div className="px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
