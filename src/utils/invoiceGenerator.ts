import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Define Order interface based on what's used in Dashboard
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
}

export const generateInvoice = (orders: Order[]) => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 20;

    orders.forEach((order, index) => {
        if (index > 0) {
            doc.addPage();
        }

        // --- Styling Constants ---
        const primaryColor = [20, 20, 20] as [number, number, number]; // #141414
        const secondaryColor = [100, 100, 100] as [number, number, number]; // Grey
        const lineColor = [230, 230, 230] as [number, number, number]; // Light grey border
        const hairline = 0.1;

        // --- Helper: Horizontal Line ---
        const drawLine = (y: number) => {
            doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
            doc.setLineWidth(hairline);
            doc.line(margin, y, width - margin, y);
        };

        // --- Header ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(32);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("INVOICE", margin, 35);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold"); // Bold for brand name
        doc.text("SHOP ANGONALOY", width - margin, 30, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("Dhaka, Bangladesh", width - margin, 34, { align: "right" });
        doc.text("shopangonaloy.com", width - margin, 38, { align: "right" });

        drawLine(50);

        // --- Meta Data Grid (Order Info & Date) ---
        // Left Col: Invoice No
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("REFERENCE NO", margin, 60);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal"); // Number tends to look better normal or slightly bold
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`#${order.order_number}`, margin, 66);

        // Right Col: Date
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("DATE ISSUED", width - margin, 60, { align: "right" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(format(new Date(order.created_at), "MMMM dd, yyyy"), width - margin, 66, { align: "right" });

        drawLine(80);

        // --- Bill To ---
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("BILLED TO", margin, 90);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(order.customer_name || "Guest Customer", margin, 98);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        if (order.phone) doc.text(order.phone, margin, 104);

        if (order.address) {
            const addressLines = doc.splitTextToSize(order.address, width / 2);
            doc.text(addressLines, margin, 110);
        }

        // --- Product Table ---
        const productString = order.product || "Item";
        const subtotal = order.price || 0;
        const shipping = order.delivery_rate || 0;

        // Simplification: Price is treated as amount for the item
        const tableData = [
            [productString, order.quantity || 1, subtotal.toLocaleString()]
        ];

        autoTable(doc, {
            startY: 140,
            head: [["ITEM", "QUANTITY", "PRICE (BDT)"]],
            body: tableData,
            theme: "plain",
            styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: { top: 10, bottom: 10, left: 0, right: 0 },
                lineColor: lineColor,
                lineWidth: 0, // No borders on cells
                textColor: primaryColor,
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: secondaryColor,
                fontStyle: "bold",
                fontSize: 7,
            },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: 40, halign: "center" },
                2: { cellWidth: 40, halign: "right" },
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
                // Draw line under header
                doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
                doc.setLineWidth(hairline);
                const headerY = data.settings.startY + 8; // Approx header height
                doc.line(margin, headerY, width - margin, headerY);
            },
            didDrawCell: (data) => {
                // Draw line after each row
                if (data.section === 'body' && data.column.index === 2) {
                    const y = data.cell.y + data.cell.height;
                    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
                    doc.setLineWidth(hairline);
                    doc.line(margin, y, width - margin, y);
                }
            }
        });

        // --- Totals ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable.finalY + 15;

        // Subtotal
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("SUBTOTAL", width - 80, finalY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(subtotal.toLocaleString(), width - margin, finalY, { align: "right" });

        // Shipping
        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("SHIPPING", width - 80, finalY + 8);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(shipping.toLocaleString(), width - margin, finalY + 8, { align: "right" });

        // Divider for Total
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
        doc.line(width - 80, finalY + 14, width - margin, finalY + 14);

        // Total
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("TOTAL DUE", width - 80, finalY + 22);

        doc.setFontSize(14);
        doc.text(`BDT ${(subtotal + shipping).toLocaleString()}`, width - margin, finalY + 22, { align: "right" });

        // --- Footer ---
        const footerY = height - 20;

        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
        doc.line(margin, footerY - 10, width - margin, footerY - 10);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("SHOP ANGONALOY © " + new Date().getFullYear(), margin, footerY);

        doc.text("Page " + doc.getCurrentPageInfo().pageNumber, width - margin, footerY, { align: "right" });
    });

    const filename = orders.length > 1
        ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
        : `Invoice_${orders[0].order_number}.pdf`;

    doc.save(filename);
};
