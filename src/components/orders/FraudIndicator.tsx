
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";

interface FraudData {
    mobile_number: string;
    total_parcels: number;
    total_delivered: number;
    total_cancel: number;
    apis?: Record<string, {
        total_parcels: number;
        total_delivered_parcels: number;
        total_cancelled_parcels: number;
    }>;
}

interface Order {
    id: string;
    shopify_order_id: number;
    order_number: string;
    customer_name: string | null;
    phone: string | null;
    address: string | null;
    product: string | null;
    quantity: number | null;
    price: number | null;
    status: string;
    created_at: string;
    fraud_checked: boolean | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fraud_data: FraudData | any | null;
    delivery_rate: number | null;
    sent_to_courier?: boolean | null;
    courier_status?: string | null;
    consignment_id?: number | null;
    tracking_code?: string | null;
    courier_message?: string | null;
    notes?: string | null;
    fulfillment_status?: string | null;
}

export function FraudIndicator({ order }: { order: Order }) {
    if (!order.fraud_checked || !order.fraud_data) {
        return (
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex items-center justify-center">
                        <HelpCircle className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-card border-border shadow-lg">
                    <p className="text-sm text-muted-foreground">
                        {!order.fraud_checked ? "Not checked yet" : "No data available"}
                    </p>
                </TooltipContent>
            </Tooltip>
        );
    }

    const { total_parcels, total_delivered, total_cancel } = order.fraud_data;

    // Calculate delivery rate from fraud_data directly (not from order.delivery_rate which is shipping cost)
    const deliveryRate = total_parcels > 0
        ? (total_delivered / total_parcels) * 100
        : 0;

    // Determine risk level based on delivery rate
    let RiskIcon: typeof ShieldCheck;
    let riskColor: string;
    let riskBgColor: string;
    let riskLabel: string;

    if (total_parcels === 0) {
        RiskIcon = HelpCircle;
        riskColor = "text-muted-foreground";
        riskBgColor = "bg-muted/50";
        riskLabel = "New Customer";
    } else if (deliveryRate >= 70) {
        RiskIcon = ShieldCheck;
        riskColor = "text-emerald-600";
        riskBgColor = "bg-emerald-50";
        riskLabel = "Safe";
    } else if (deliveryRate >= 50) {
        RiskIcon = AlertTriangle;
        riskColor = "text-amber-600";
        riskBgColor = "bg-amber-50";
        riskLabel = "Caution";
    } else {
        RiskIcon = ShieldAlert;
        riskColor = "text-red-600";
        riskBgColor = "bg-red-50";
        riskLabel = "High Risk";
    }

    return (
        <Tooltip delayDuration={0}>
            <TooltipTrigger>
                <div className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md ${riskBgColor} transition-colors`}>
                    <RiskIcon className={`h-3.5 w-3.5 ${riskColor}`} />
                    <span className={`text-[10px] font-semibold tabular-nums ${riskColor}`}>
                        {total_parcels > 0 ? `${deliveryRate.toFixed(0)}%` : "N/A"}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent
                side="right"
                align="start"
                className="w-72 p-0 bg-card border-border shadow-xl rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div className={`px-4 py-3 ${riskBgColor} border-b border-border/50`}>
                    <div className="flex items-center gap-2">
                        <RiskIcon className={`h-5 w-5 ${riskColor}`} />
                        <span className={`font-semibold ${riskColor}`}>{riskLabel}</span>
                    </div>
                    {total_parcels > 0 && (
                        <p className="text-2xl font-bold mt-1 text-foreground">
                            {deliveryRate.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">delivery rate</span>
                        </p>
                    )}
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{total_parcels}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">{total_delivered}</p>
                            <p className="text-xs text-muted-foreground">Delivered</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{total_cancel}</p>
                            <p className="text-xs text-muted-foreground">Cancelled</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {total_parcels > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Delivery Success</span>
                                <span>{total_delivered}/{total_parcels}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${deliveryRate}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Courier breakdown */}
                    {order.fraud_data?.apis && Object.keys(order.fraud_data.apis).length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">By Courier</p>
                            <div className="space-y-1.5">
                                {Object.entries(order.fraud_data.apis).map(([courier, data]) => {
                                    const courierData = data as { total_delivered_parcels: number; total_parcels: number };
                                    const courierRate = courierData.total_parcels > 0
                                        ? (courierData.total_delivered_parcels / courierData.total_parcels) * 100
                                        : 0;
                                    return (
                                        <div key={courier} className="flex items-center justify-between text-sm">
                                            <span className="text-foreground">{courier}</span>
                                            <span className="font-mono text-muted-foreground">
                                                {courierData.total_delivered_parcels}/{courierData.total_parcels}
                                                {courierData.total_parcels > 0 && (
                                                    <span className="ml-1 text-xs">({courierRate.toFixed(0)}%)</span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
