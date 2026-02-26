import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch all orders for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to fetch orders");
    }

    // Build order summary for context
    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter((o) => o.status === "pending") || [];
    const confirmedOrders = orders?.filter((o) => o.status === "confirmed") || [];
    const cancelledOrders = orders?.filter((o) => o.status === "cancelled") || [];
    const sentToCourier = orders?.filter((o) => o.sent_to_courier) || [];
    const notSentToCourier = orders?.filter((o) => !o.sent_to_courier) || [];
    const withNotes = orders?.filter((o) => o.notes) || [];
    const fraudChecked = orders?.filter((o) => o.fraud_checked) || [];

    const totalRevenue = orders?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
    const totalDeliveryCharges = orders?.reduce((sum, o) => sum + (o.delivery_rate || 0), 0) || 0;

    const orderDetails = orders?.map((o) => ({
      order_number: o.order_number,
      customer: o.customer_name,
      phone: o.phone,
      address: o.address,
      product: o.product,
      quantity: o.quantity,
      price: o.price,
      delivery_rate: o.delivery_rate,
      status: o.status,
      fulfillment_status: o.fulfillment_status,
      sent_to_courier: o.sent_to_courier,
      consignment_id: o.consignment_id,
      tracking_code: o.tracking_code,
      courier_status: o.courier_status,
      courier_message: o.courier_message,
      fraud_checked: o.fraud_checked,
      fraud_data: o.fraud_data,
      notes: o.notes,
      created_at: o.created_at,
    })) || [];

    const systemPrompt = `You are an intelligent order management assistant for Angonaloy, a Bangladeshi e-commerce business. You have full access to all order data. Answer questions accurately based on the data provided.

## Response Style Rules (STRICTLY FOLLOW)
- NEVER use markdown tables. They look bad.
- Use compact numbered lists when listing orders. Format: "1. #OrderNum (Customer): detail"
- Keep answers short and direct. No filler sentences.
- Use bold for key numbers and stats.
- When showing multiple orders, group them logically (by status, by date, etc.) if it makes sense.
- Don't ask follow-up questions unless truly needed.
- Use ৳ (Taka) for currency.

## Order Summary
- Total Orders: ${totalOrders}
- Pending: ${pendingOrders.length}
- Confirmed: ${confirmedOrders.length}
- Cancelled: ${cancelledOrders.length}
- Sent to Steadfast (courier): ${sentToCourier.length}
- Not sent to courier: ${notSentToCourier.length}
- Orders with notes: ${withNotes.length}
- Fraud checked: ${fraudChecked.length}
- Total Revenue (product prices): ৳${totalRevenue}
- Total Delivery Charges: ৳${totalDeliveryCharges}

## All Orders (JSON)
${JSON.stringify(orderDetails, null, 1)}

`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("order-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
