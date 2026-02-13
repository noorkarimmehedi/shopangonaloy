import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date, startDate, endDate, startOrder, endOrder } = await req.json();

    let orders;
    let ordersError;
    let dateLabel;

    if (startOrder && endOrder) {
      dateLabel = `Orders #${startOrder} to #${endOrder}`;
      const { data, error } = await supabase
        .from("orders")
        .gte("order_number", startOrder)
        .lte("order_number", endOrder)
        .order("order_number", { ascending: true });
      orders = data;
      ordersError = error;
    } else {
      const from = startDate || date;
      const to = endDate || from;
      if (!from) {
        return new Response(JSON.stringify({ error: "Date or Order Range is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      dateLabel = from === to ? from : `${from} to ${to}`;
      const rangeStart = `${from}T00:00:00.000Z`;
      const rangeEnd = `${to}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("orders")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .order("created_at", { ascending: true });
      orders = data;
      ordersError = error;
    }

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          analysis: `No orders found for ${dateLabel}.`,
          orders: [],
          summary: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build item summary
    const itemMap: Record<string, { quantity: number; revenue: number; orderCount: number }> = {};
    for (const order of orders) {
      const product = order.product || "Unknown Item";
      const qty = order.quantity || 1;
      const price = order.price || 0;

      if (!itemMap[product]) {
        itemMap[product] = { quantity: 0, revenue: 0, orderCount: 0 };
      }
      itemMap[product].quantity += qty;
      itemMap[product].revenue += price * qty;
      itemMap[product].orderCount += 1;
    }

    const summary = Object.entries(itemMap)
      .map(([item, data]) => ({
        item,
        quantity: data.quantity,
        revenue: data.revenue,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Call OpenAI for analysis
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `You are an order analysis assistant. Analyze the following order data for ${dateLabel}.

Total orders: ${orders.length}
Item breakdown:
${summary.map((s: any) => `- ${s.item}: ${s.quantity} units ordered across ${s.orderCount} orders (Revenue: ৳${s.revenue.toFixed(2)})`).join("\n")}

Orders with statuses:
${orders.map((o: any) => `- Order #${o.order_number}: ${o.product || "Unknown"} x${o.quantity || 1} — Status: ${o.status}, Fulfillment: ${o.fulfillment_status || "N/A"}`).join("\n")}

Provide a concise summary of:
1. Which items were ordered and in what quantities
2. If any order has multiple items, highlight that separately
3. Overall order status breakdown (confirmed, pending, cancelled etc.)
Keep it brief and actionable.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful order analysis assistant. Be concise and use bullet points." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiRes.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiRes.json();
    const analysis = openaiData.choices?.[0]?.message?.content || "Unable to generate analysis.";

    return new Response(
      JSON.stringify({ analysis, summary, totalOrders: orders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-orders error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
