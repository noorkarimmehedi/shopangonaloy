import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  product: string | null;
  quantity: number | null;
  price: number | null;
  status: string;
  created_at: string;
  delivery_rate: number | null;
  courier_status?: string | null;
  consignment_id?: number | null;
  tracking_code?: string | null;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildInvoiceHtml = (order: Order): string => {
  const invoiceNo = order.order_number.replace("#", "");
  const subtotal = order.price || 0;
  const shipping = order.delivery_rate || 0;
  const total = subtotal + shipping;
  const qty = order.quantity || 1;
  const consignmentId = order.consignment_id ?? (order as any).consignment_id;

  return `
    <div style="width:283px;padding:15px;font-family:'Noto Sans Bengali','Hind Siliguri',sans-serif;font-size:10px;color:#000;background:#fff;box-sizing:border-box;">
      <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">Angonaloy</div>

      <div style="font-size:10px;line-height:1.6;">
        <div><span style="font-weight:normal;">Invoice No.: </span><strong>AN-${invoiceNo}</strong></div>
        <div><span style="font-weight:normal;">Invoice Date: </span><strong>${format(new Date(order.created_at), "MMM dd, yyyy")}</strong></div>
        <div><span style="font-weight:normal;">Courier: </span><strong>Steadfast</strong></div>
        ${consignmentId != null ? `<div><span style="font-weight:normal;">Delivery ID: </span><strong>${String(consignmentId)}</strong></div>` : ""}
      </div>

      <div style="margin-top:10px;font-weight:bold;margin-bottom:6px;">Invoice To:</div>
      <div style="line-height:1.6;">
        <div>· ${order.customer_name || "Customer"}</div>
        ${order.phone ? `<div>· ${order.phone}</div>` : ""}
        ${order.address ? `<div>· ${order.address}</div>` : ""}
      </div>

      <hr style="border:none;border-top:1px solid #000;margin:10px 0 6px;" />

      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="border-bottom:1px solid #000;">
            <th style="text-align:left;padding:2px 0;font-weight:bold;">Product</th>
            <th style="text-align:center;padding:2px 0;font-weight:bold;width:30px;">Qty</th>
            <th style="text-align:right;padding:2px 0;font-weight:bold;width:60px;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:4px 0;">${order.product || "Item"}</td>
            <td style="text-align:center;padding:4px 0;">${qty}</td>
            <td style="text-align:right;padding:4px 0;">${formatCurrency(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <hr style="border:none;border-top:1px solid #000;margin:6px 0;" />

      <div style="font-size:10px;font-weight:bold;line-height:1.8;">
        <div style="display:flex;justify-content:space-between;">
          <span>Sub Total</span><span>${formatCurrency(subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Delivery Fee</span><span>${formatCurrency(shipping)}</span>
        </div>
        <hr style="border:none;border-top:1px solid #000;margin:4px 0;" />
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span>Grand Total</span><span>${formatCurrency(total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span>Due Amount</span><span>${formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  `;
};

const renderOrderToCanvas = async (order: Order): Promise<HTMLCanvasElement> => {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = buildInvoiceHtml(order);
  document.body.appendChild(container);

  // Load Bengali web font before rendering
  try {
    await document.fonts.ready;
  } catch {}

  const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  document.body.removeChild(container);
  return canvas;
};

const buildPdfFromCanvases = async (orders: Order[]): Promise<jsPDF> => {
  const pageWidth = 75;
  const pageHeight = 100;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  for (let i = 0; i < orders.length; i++) {
    if (i > 0) doc.addPage([pageWidth, pageHeight]);

    const canvas = await renderOrderToCanvas(orders[i]);
    const imgData = canvas.toDataURL("image/png");

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    doc.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
  }

  return doc;
};

export const generateInvoice = async (orders: Order[]) => {
  const doc = await buildPdfFromCanvases(orders);
  const filename =
    orders.length > 1
      ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      : `Invoice_${orders[0].order_number}.pdf`;
  doc.save(filename);
};

export const printInvoice = async (orders: Order[]) => {
  const doc = await buildPdfFromCanvases(orders);
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onafterprint = () => {
      printWindow.close();
      URL.revokeObjectURL(url);
    };
  }
};
