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

    orders.forEach((order, index) => {
        if (index > 0) {
            doc.addPage();
        }

        // --- Header ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text("INVOICE", 20, 30);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("SHOP ANGONALOY", width - 20, 30, { align: "right" });
        doc.text("Dhaka, Bangladesh", width - 20, 35, { align: "right" });
        doc.text("shopangonaloy.com", width - 20, 40, { align: "right" });

        // --- Divider ---
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, 45, width - 20, 45);

        // --- Invoice Info ---
        doc.setFontSize(10);
        doc.text("INVOICE NO:", 20, 60);
        doc.setFont("helvetica", "bold");
        doc.text(`#${order.order_number}`, 50, 60);

        doc.setFont("helvetica", "normal");
        doc.text("DATE:", 20, 66);
        doc.setFont("helvetica", "bold");
        doc.text(format(new Date(order.created_at), "MMM dd, yyyy"), 50, 66);

        // --- Customer Info ---
        doc.setFont("helvetica", "bold");
        doc.text("BILL TO:", 20, 85);
        doc.setFont("helvetica", "normal");
        doc.text(order.customer_name || "Guest", 20, 91);
        doc.text(order.phone || "", 20, 97);
        doc.text(doc.splitTextToSize(order.address || "", 80), 20, 103);

        // --- Product Table ---
        // Prepare data
        // For simplicity, we assume 'product' is a comma-separated list or single string
        // In a real scenario, this might need parsing complex JSON or related tables
        const productString = order.product || "Item";
        const subtotal = order.price || 0;
        const shipping = order.delivery_rate || 0;
        // const total = subtotal + shipping; // This might double count if subtotal already includes shipping? 
        // Usually 'price' is total order value in many systems, let's assume price is grand total for now unless specified.
        // However, looking at Dashboard, price usually is total. Let's assume price is product price + shipping.
        // In many simple systems, price is the final amount.
        // Let's display Price as Total and calculate subtotal/shipping if needed, or just list Total.

        // Simplification for this specific request:
        const tableData = [
            [productString, order.quantity || 1, subtotal.toLocaleString()]
        ];

        autoTable(doc, {
            startY: 130,
            head: [["DESCRIPTION", "QTY", "AMOUNT (BDT)"]],
            body: tableData,
            theme: "plain",
            styles: {
                font: "helvetica",
                fontSize: 10,
                cellPadding: 8,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [250, 250, 250],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                lineWidth: 0.1,
                lineColor: [200, 200, 200],
            },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: 30, halign: "center" },
                2: { cellWidth: 40, halign: "right" },
            },
            margin: { left: 20, right: 20 },
        });

        // --- Totals ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Let's assume 'price' is the final total collected from customer
        const grandTotal = subtotal;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", width - 65, finalY);
        doc.text(`BDT ${grandTotal.toLocaleString()}`, width - 25, finalY, { align: "right" });

        // --- Footer ---
        const footerY = height - 20;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("Thank you for your business.", width / 2, footerY, { align: "center" });

        // Page Number
        const pageCount = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.text(`Page 1 of 1`, width - 20, footerY, { align: "right" });
    });

    const filename = orders.length > 1
        ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
        : `Invoice_${orders[0].order_number}_${format(new Date(), "yyyyMMdd")}.pdf`;

    doc.save(filename);
};
