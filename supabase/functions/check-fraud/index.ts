import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CourierHistoryEntry {
  courier: string;
  total: number;
  successful: number;
  failed: number;
}

interface FraudShieldResponse {
  success: boolean;
  data: {
    phone: string;
    total_parcels: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
    fraud_risk: string;
    last_delivery: string;
    courier_history: CourierHistoryEntry[];
  };
}

// Normalized fraud data stored in the DB (matches frontend expectations)
interface NormalizedFraudData {
  mobile_number: string;
  total_parcels: number;
  total_delivered: number;
  total_cancel: number;
  fraud_risk: string;
  success_rate: number;
  last_delivery: string;
  apis: Record<string, {
    total_parcels: number;
    total_delivered_parcels: number;
    total_cancelled_parcels: number;
  }>;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check fraud status via the FraudShield API.
 * Returns data normalized to the shape the frontend already expects.
 */
async function checkFraudStatus(
  phone: string,
  apiKey: string,
): Promise<{ fraudData: NormalizedFraudData | null; successRate: number | null }> {
  if (!phone || !apiKey) {
    return { fraudData: null, successRate: null };
  }

  // Clean phone number – remove non-digits
  let cleanPhone = phone.replace(/\D/g, "");

  // Handle Bangladesh country code formats
  if (cleanPhone.startsWith("880")) {
    const afterCountryCode = cleanPhone.slice(3);
    if (afterCountryCode.startsWith("01") && afterCountryCode.length === 11) {
      cleanPhone = afterCountryCode;
    } else if (afterCountryCode.startsWith("1") && afterCountryCode.length === 10) {
      cleanPhone = "0" + afterCountryCode;
    }
  }

  // Validate Bangladesh number format
  if (cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
    console.log(`Skipping fraud check for invalid BD number: ${phone} -> ${cleanPhone}`);
    return { fraudData: null, successRate: null };
  }

  try {
    console.log(`Checking fraud status for: ${cleanPhone}`);

    const response = await fetch("https://fraudshield.bd/api/customer/check", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: cleanPhone }),
    });

    if (!response.ok) {
      console.error(`FraudShield API error for ${cleanPhone}: ${response.status}`);
      return { fraudData: null, successRate: null };
    }

    const rawText = await response.text();
    console.log(`FraudShield raw response for ${cleanPhone}: ${rawText.substring(0, 300)}`);
    
    let result: FraudShieldResponse;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error(`Failed to parse FraudShield response for ${cleanPhone}`);
      return { fraudData: null, successRate: null };
    }

    if (!result.success || !result.data) {
      console.error(`FraudShield returned unsuccessful for ${cleanPhone}`);
      return { fraudData: null, successRate: null };
    }

    const d = result.data;

    // Transform courier_history → apis object (matches frontend format)
    const apis: NormalizedFraudData["apis"] = {};
    for (const entry of d.courier_history || []) {
      apis[entry.courier] = {
        total_parcels: entry.total,
        total_delivered_parcels: entry.successful,
        total_cancelled_parcels: entry.failed,
      };
    }

    const successRate = d.success_rate;

    const fraudData: NormalizedFraudData = {
      mobile_number: cleanPhone,
      total_parcels: d.total_parcels,
      total_delivered: d.successful_deliveries,
      total_cancel: d.failed_deliveries,
      fraud_risk: d.fraud_risk,
      success_rate: successRate,
      last_delivery: d.last_delivery || "",
      apis,
    };

    console.log(
      `Fraud check result for ${cleanPhone}: ${d.successful_deliveries}/${d.total_parcels} delivered (${successRate}%)`,
    );

    return { fraudData, successRate };
  } catch (error) {
    console.error(`Error checking fraud for ${cleanPhone}:`, error);
    return { fraudData: null, successRate: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting check-fraud function");

    const fraudShieldApiKey = Deno.env.get("FRAUDSHIELD_API_KEY");
    if (!fraudShieldApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing FRAUDSHIELD_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional body
    let body: { orderId?: string; skipSync?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided – do bulk check with sync
    }

    // For bulk fraud check, first sync Shopify orders
    if (!body.orderId && !body.skipSync) {
      console.log("Syncing Shopify orders before fraud check...");
      try {
        const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
        const apikey = req.headers.get("apikey") ?? "";

        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-shopify-orders`, {
          method: "POST",
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(apikey ? { apikey } : {}),
            "Content-Type": "application/json",
          },
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log(`Shopify sync complete: ${syncData.synced || 0} orders synced`);
        } else {
          console.error("Shopify sync failed:", await syncResponse.text());
        }
      } catch (syncError) {
        console.error("Error syncing Shopify orders:", syncError);
      }
    }

    // ── Single-order check ───────────────────────────────────────────────
    if (body.orderId) {
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, phone, fraud_checked, fraud_data")
        .eq("id", body.orderId)
        .single();

      if (fetchError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!order.phone) {
        return new Response(
          JSON.stringify({ error: "Order has no phone number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { fraudData } = await checkFraudStatus(order.phone, fraudShieldApiKey);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ fraud_checked: true, fraud_data: fraudData })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .single();

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Bulk check: latest 15 orders ─────────────────────────────────────
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, shopify_order_id, phone, fraud_checked, fraud_data")
      .order("shopify_order_id", { ascending: false })
      .limit(15);

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ordersToCheck = (orders || []).filter(o => !o.fraud_data && o.phone);
    console.log(`Found ${ordersToCheck.length} orders to check (out of ${orders?.length || 0} latest)`);

    let checkedCount = 0;
    let successCount = 0;

    for (const order of ordersToCheck) {
      if (checkedCount > 0) await delay(1500);

      const { fraudData } = await checkFraudStatus(order.phone, fraudShieldApiKey);
      checkedCount++;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ fraud_checked: true, fraud_data: fraudData })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
      } else if (fraudData) {
        successCount++;
      }
    }

    console.log(`Fraud check complete: ${successCount}/${checkedCount} successful`);

    const { data: allOrders, error: allOrdersError } = await supabase
      .from("orders")
      .select("*")
      .order("shopify_order_id", { ascending: false });

    if (allOrdersError) {
      console.error("Error fetching all orders:", allOrdersError);
    }

    return new Response(
      JSON.stringify({ success: true, checked: checkedCount, successful: successCount, orders: allOrders || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
