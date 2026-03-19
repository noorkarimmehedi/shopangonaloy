import jsPDF from "jspdf";
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

const buildInvoicePdf = (orders: Order[]) => {
  // Receipt-style small label: ~80mm x ~120mm (similar to thermal/shipping label)
  const pageWidth = 75;
  const pageHeight = 100;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  orders.forEach((order, index) => {
    if (index > 0) {
      doc.addPage([pageWidth, pageHeight]);
    }

    let y = margin + 2;

    // --- Brand Name ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Angonaloy", margin, y);
    y += 5;

    // --- Invoice Details ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const invoiceNo = order.order_number.replace("#", "");

    doc.text(`Invoice No.: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(`AN-${invoiceNo}`, margin + 16, y);
    y += 3.5;

    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Date: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(order.created_at), "MMM dd, yyyy"), margin + 16, y);
    y += 3.5;

    doc.setFont("helvetica", "normal");
    doc.text(`Courier: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text("Steadfast", margin + 16, y);
    y += 3.5;

    const consignmentId = order.consignment_id ?? (order as any).consignment_id;
    if (consignmentId != null) {
      y += 1;
      const label = "Delivery ID:";
      const idText = String(consignmentId);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      const labelWidth = doc.getTextWidth(label);
      const idWidth = doc.getTextWidth(idText);
      const boxPadX = 2;
      const boxH = 5;
      const gap = 2;

      // Full box encompassing label + id
      const totalBoxW = labelWidth + gap + idWidth + boxPadX * 2;
      const boxX = margin;
      const boxY = y - 3.2;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(boxX, boxY, totalBoxW, boxH);

      doc.setFont("helvetica", "normal");
      doc.text(label, boxX + boxPadX, y);
      doc.setFont("helvetica", "bold");
      doc.text(idText, boxX + boxPadX + labelWidth + gap, y);

      y += boxH + 1.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }

    y += 2;

    // --- Invoice To ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Invoice To:", margin, y);
    y += 4;

    doc.setFontSize(7);
    // Name with icon
    doc.setFont("helvetica", "normal");
    doc.text("\u00B7", margin, y); // bullet
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_name || "Customer", margin + 3, y);
    y += 3.5;

    // Phone
    if (order.phone) {
      doc.text("\u00B7", margin, y);
      doc.text(order.phone, margin + 3, y);
      y += 3.5;
    }

    // Address
    if (order.address) {
      doc.text("\u00B7", margin, y);
      const addressLines = doc.splitTextToSize(order.address, contentWidth - 5);
      doc.text(addressLines, margin + 3, y);
      y += addressLines.length * 3.5;
    }

    y += 3;

    // --- Divider line ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    // --- Table Header ---
    const col1X = margin;
    const col2X = margin + 42;
    const col3X = margin + 52;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Product", col1X, y);
    doc.text("Qty", col2X, y);
    doc.text("Price", col3X, y, { align: "left" });
    y += 1;

    // Header underline
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    // --- Product Row ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const productName = order.product || "Item";
    const productLines = doc.splitTextToSize(productName, 38);
    doc.text(productLines, col1X, y);

    const qty = order.quantity || 1;
    doc.text(String(qty), col2X + 2, y);

    const subtotal = order.price || 0;
    const priceStr = subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(priceStr, pageWidth - margin, y, { align: "right" });

    y += productLines.length * 3.5 + 2;

    // --- Divider ---
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // --- Totals ---
    const shipping = order.delivery_rate || 0;
    const total = subtotal + shipping;

    const labelX = margin + 28;
    const valueX = pageWidth - margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);

    doc.text("Sub Total", labelX, y);
    doc.text(subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    doc.text("Delivery Fee", labelX, y);
    doc.text(shipping.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    // Grand Total line
    doc.setLineWidth(0.2);
    doc.line(labelX, y - 1, pageWidth - margin, y - 1);
    y += 2;

    doc.setFontSize(8);
    doc.text("Grand Total", labelX, y);
    doc.text(total.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    doc.text("Due Amount", labelX, y);
    doc.text(total.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
  });

  return doc;
};

export const generateInvoice = (orders: Order[]) => {
  const doc = buildInvoicePdf(orders);
  const filename = orders.length > 1
    ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
    : `Invoice_${orders[0].order_number}.pdf`;
  doc.save(filename);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (value: number | null | undefined) =>
  (value ?? 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const printInvoice = (orders: Order[]) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");

  if (!printWindow) {
    generateInvoice(orders);
    return;
  }

  const invoicePages = orders
    .map((order) => {
      const invoiceNo = escapeHtml(order.order_number.replace("#", ""));
      const customerName = escapeHtml(order.customer_name || "Customer");
      const phone = order.phone ? escapeHtml(order.phone) : "";
      const address = order.address ? escapeHtml(order.address) : "";
      const product = escapeHtml(order.product || "Item");
      const qty = order.quantity || 1;
      const subtotal = order.price || 0;
      const shipping = order.delivery_rate || 0;
      const total = subtotal + shipping;
      const consignmentId = order.consignment_id ?? (order as any).consignment_id;

      return `
        <section class="invoice">
          <div class="brand">Angonaloy</div>
          <div class="meta"><span>Invoice No.:</span> <strong>AN-${invoiceNo}</strong></div>
          <div class="meta"><span>Invoice Date:</span> <strong>${format(new Date(order.created_at), "MMM dd, yyyy")}</strong></div>
          <div class="meta"><span>Courier:</span> <strong>Steadfast</strong></div>
          ${consignmentId != null ? `<div class="delivery-id-label">Delivery ID:</div><div class="delivery-id-box">${escapeHtml(String(consignmentId))}</div>` : ""}

          <div class="section-title">Invoice To:</div>
          <div class="line">• ${customerName}</div>
          ${phone ? `<div class="line">• ${phone}</div>` : ""}
          ${address ? `<div class="line">• ${address}</div>` : ""}

          <hr />

          <div class="table-head"><span>Product</span><span>Qty</span><span>Price</span></div>
          <div class="table-row"><span>${product}</span><span>${qty}</span><span>${formatMoney(subtotal)}</span></div>

          <hr />

          <div class="total"><span>Sub Total</span><span>${formatMoney(subtotal)}</span></div>
          <div class="total"><span>Delivery Fee</span><span>${formatMoney(shipping)}</span></div>
          <div class="total grand"><span>Grand Total</span><span>${formatMoney(total)}</span></div>
          <div class="total grand"><span>Due Amount</span><span>${formatMoney(total)}</span></div>
        </section>
      `;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice Print</title>
        <style>
          @page { size: 75mm 100mm; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #000;
          }
          .invoice {
            width: 75mm;
            height: 100mm;
            padding: 4mm;
            page-break-after: always;
            font-size: 8.5px;
            line-height: 1.2;
          }
          .invoice:last-child { page-break-after: auto; }
          .brand { font-size: 16px; font-weight: 700; margin-bottom: 1.5mm; }
          .meta { margin-bottom: 0.8mm; }
          .meta span { display: inline-block; min-width: 17mm; }
          .section-title { font-weight: 700; margin-top: 1.6mm; margin-bottom: 1mm; }
          .line { margin-bottom: 0.8mm; word-break: break-word; }
          .delivery-id-label { margin-top: 1.3mm; margin-bottom: 0.8mm; }
          .delivery-id-box {
            display: inline-block;
            border: 1px solid #000;
            padding: 0.5mm 2.2mm;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.2px;
            margin-bottom: 1.4mm;
          }
          hr { border: none; border-top: 1px solid #000; margin: 1.6mm 0; }
          .table-head,
          .table-row,
          .total {
            display: grid;
            grid-template-columns: 1fr 8mm 14mm;
            gap: 1mm;
            align-items: start;
            margin-bottom: 0.9mm;
          }
          .table-head { font-weight: 700; }
          .table-head span:nth-child(2),
          .table-row span:nth-child(2) { text-align: center; }
          .table-head span:nth-child(3),
          .table-row span:nth-child(3),
          .total span:last-child { text-align: right; }
          .total { grid-template-columns: 1fr 14mm; }
          .total.grand { font-weight: 700; font-size: 9.5px; }
        </style>
      </head>
      <body>${invoicePages}</body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 250);
    }, 250);
  };
};
