import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import XLSX from 'xlsx-js-style';

export interface PDFExportOptions {
    title: string;
    subtitle?: string;
    htmlContent: string;
}

export async function exportToPDF({ title, subtitle, htmlContent }: PDFExportOptions) {
    try {
        const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${title}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        @page { margin: 40px; }
                        body { 
                            font-family: 'Inter', -apple-system, sans-serif; 
                            color: #1f2937; 
                            line-height: 1.6; 
                            padding: 20px;
                            background-color: #ffffff;
                        }
                        .header { 
                            text-align: center;
                            border-bottom: 3px solid #10b981; 
                            padding-bottom: 25px; 
                            margin-bottom: 35px; 
                        }
                        .header h1 { 
                            color: #10b981; 
                            margin: 0; 
                            font-size: 32px; 
                            font-weight: 900;
                            letter-spacing: -0.025em;
                            text-transform: uppercase;
                        }
                        .header p { 
                            color: #6b7280; 
                            margin: 8px 0 0; 
                            font-size: 14px; 
                            font-weight: 500;
                        }
                        .section-title {
                            text-align: center;
                            font-weight: 900;
                            color: #374151;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            font-size: 14px;
                            margin: 30px 0 15px;
                            padding: 8px;
                            background: #f9fafb;
                            border-radius: 6px;
                        }
                        .footer { 
                            margin-top: 50px; 
                            border-top: 1px solid #e5e7eb; 
                            padding-top: 20px; 
                            font-size: 11px; 
                            color: #9ca3af; 
                            text-align: center; 
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 10px; 
                            font-size: 12px; 
                            border: 1px solid #e5e7eb;
                        }
                        th { 
                            background-color: #10b981; 
                            color: white; 
                            font-weight: 700; 
                            text-align: center; 
                            padding: 12px 8px; 
                            text-transform: uppercase;
                            font-size: 11px;
                        }
                        td { 
                            padding: 10px 8px; 
                            border-bottom: 1px solid #f3f4f6; 
                            text-align: center;
                            color: #4b5563;
                        }
                        tr:nth-child(even) { background-color: #f9fafb; }
                        .kpi-container { 
                            display: flex; 
                            gap: 20px; 
                            margin-bottom: 30px; 
                            justify-content: center;
                        }
                        .kpi-card { 
                            background: #ffffff; 
                            border-radius: 12px; 
                            padding: 20px; 
                            flex: 1; 
                            min-width: 140px; 
                            border: 1px solid #e5e7eb;
                            text-align: center;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        }
                        .kpi-value { 
                            font-size: 24px; 
                            font-weight: 900; 
                            color: #111827; 
                            margin-bottom: 4px;
                        }
                        .kpi-label { 
                            font-size: 10px; 
                            text-transform: uppercase; 
                            color: #10b981; 
                            font-weight: 800; 
                            letter-spacing: 0.05em;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${title}</h1>
                        ${subtitle ? `<p>${subtitle}</p>` : ''}
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${htmlContent}
                    
                    <div class="footer">
                        <p>This report was automatically generated by Poultry Solution Management Suite.</p>
                        <p>&copy; ${new Date().getFullYear()} Feed Reminder Up</p>
                    </div>
                </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ html: fullHtml });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Share ${title}`,
                UTI: 'com.adobe.pdf'
            });
        }
        return true;
    } catch (error) {
        console.error("PDF Export Error: ", error);
        throw new Error("Failed to generate PDF");
    }
}

export interface ExcelExportOptions {
    title: string;
    summaryData: any[];
    rawDataTable: any[];
    rawHeaders: string[];
    definitions?: any[];
}

export async function exportToExcel({ title, summaryData, rawDataTable, rawHeaders, definitions = [] }: ExcelExportOptions) {
    try {
        const displayTitle = title.replace(/_/g, ' ').toUpperCase();
        const primaryColor = '10b981'; // Emerald-500

        // Construct data for SheetJS
        // Each element can be a cell object { v: value, s: style }
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
            fill: { fgColor: { rgb: primaryColor } },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const subheaderStyle = {
            font: { bold: true, color: { rgb: "4B5563" }, sz: 10 },
            fill: { fgColor: { rgb: "F3F4F6" } },
            alignment: { horizontal: "center" }
        };

        const sectionHeaderStyle = {
            font: { bold: true, color: { rgb: "374151" }, sz: 11 },
            alignment: { horizontal: "center" }
        };

        const tableHeaderStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "10b981" } },
            alignment: { horizontal: "center" }
        };

        const centeredStyle = {
            alignment: { horizontal: "center" }
        };

        const aoa: any[][] = [
            ["", { v: displayTitle, s: headerStyle }],
            ["", { v: "POULTRY SOLUTION - MANAGEMENT REPORT", s: subheaderStyle }],
            ["", { v: `Report Generated: ${new Date().toLocaleString()}`, s: centeredStyle }],
            [],
            ["", { v: "[ SUMMARY OVERVIEW ]", s: sectionHeaderStyle }],
            [] // Spacer for dynamic summary insertion
        ];

        // Ensure we have enough columns for the indent + summary tiles
        const maxCols = Math.max(rawHeaders.length, 7); // Default to at least G column for breathing room

        // Redesigned Summary: Horizontal Dashboard Tiles starting from Column B
        const itemsPerRow = Math.min(summaryData.length, 3);
        const availableColsForSummary = maxCols - 1; // Excluding margin column A
        const colSpan = Math.floor(availableColsForSummary / itemsPerRow);
        const summaryMerges: any[] = [];

        for (let i = 0; i < summaryData.length; i += itemsPerRow) {
            const chunk = summaryData.slice(i, i + itemsPerRow);
            const labelRowIndex = aoa.length;
            const valueRowIndex = aoa.length + 1;

            // Labels Row
            const labelRow: any[] = [""]; // Start with indent
            chunk.forEach((item, chunkIdx) => {
                labelRow.push({ v: item.Metric.toUpperCase(), s: subheaderStyle });
                for (let s = 1; s < colSpan; s++) labelRow.push("");
                summaryMerges.push({
                    s: { r: labelRowIndex, c: chunkIdx * colSpan + 1 },
                    e: { r: labelRowIndex, c: (chunkIdx + 1) * colSpan }
                });
            });
            aoa.push(labelRow);

            // Values Row
            const valueRow: any[] = [""]; // Start with indent
            chunk.forEach((item, chunkIdx) => {
                valueRow.push({
                    v: item.Value,
                    s: {
                        font: { bold: true, sz: 14, color: { rgb: primaryColor } },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } }
                    }
                });
                for (let s = 1; s < colSpan; s++) valueRow.push("");
                summaryMerges.push({
                    s: { r: valueRowIndex, c: chunkIdx * colSpan + 1 },
                    e: { r: valueRowIndex, c: (chunkIdx + 1) * colSpan }
                });
            });
            aoa.push(valueRow);
            aoa.push([]); // Spacer between summary rows
        }

        // Add Definitions
        if (definitions.length > 0) {
            aoa.push(["", { v: "[ CALCULATION DEFINITIONS ]", s: sectionHeaderStyle }]);
            aoa.push(["", { v: "Metric", s: { font: { italic: true, bold: true } } }, { v: "Calculation", s: { font: { italic: true, bold: true } } }]);
            definitions.forEach(d => {
                aoa.push(["", d.Metric, d.Calculation]);
            });
            aoa.push([]);
        }

        // Add Details (Raw Data)
        aoa.push([]);
        aoa.push(["", { v: "[ DETAILED RECORDS ]", s: sectionHeaderStyle }]);

        // Add Raw Table Headers (Starts at index 0)
        aoa.push(rawHeaders.map(h => ({ v: h, s: tableHeaderStyle })));

        // Add Raw Data Rows
        rawDataTable.forEach(obj => {
            aoa.push(rawHeaders.map(h => ({ v: obj[h], s: centeredStyle })));
        });

        // Create Workbook
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        // Merge titles and section headers starting from Column B (index 1)
        const merges: any[] = [
            { s: { r: 0, c: 1 }, e: { r: 0, c: maxCols - 1 } }, // Main Title
            { s: { r: 1, c: 1 }, e: { r: 1, c: maxCols - 1 } }, // Subtitle
            { s: { r: 2, c: 1 }, e: { r: 2, c: maxCols - 1 } }, // Generation Date
            ...summaryMerges
        ];

        // Dynamically find and merge all section headers [ ... ] starting from Column B
        aoa.forEach((row, rowIndex) => {
            const cells = row;
            // Check index 1 since we shifted
            const targetCell = cells[1];
            if (targetCell && typeof targetCell === 'object' && 'v' in targetCell && typeof targetCell.v === 'string') {
                if (targetCell.v.startsWith('[ ') && targetCell.v.endsWith(' ]')) {
                    merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: maxCols - 1 } });
                }
            }
        });

        worksheet['!merges'] = merges;

        // Set column widths (Auto-fit logic - enhanced for Dashboard Tiles)
        const wscols = [];
        for (let i = 0; i < maxCols; i++) {
            let maxLen = 18; // Increased minimum width for better spacing
            aoa.forEach(row => {
                if (row && row[i] !== undefined) {
                    const cell = row[i];
                    const val = (cell && typeof cell === 'object' && 'v' in cell) ? String(cell.v) : String(cell);
                    if (val && val.length > maxLen) {
                        maxLen = val.length;
                    }
                }
            });
            // Add extra padding (4 chars) and cap for safety
            wscols.push({ wch: Math.min(Math.max(maxLen + 4, 18), 60) });
        }
        worksheet['!cols'] = wscols;

        // Generate output
        const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const uint8Array = new Uint8Array(wbout);

        // Save to File System
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const file = new File(Paths.document, `${safeTitle}_${Date.now()}.xlsx`);
        file.write(uint8Array);

        // Share
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(file.uri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: `Share ${title}`,
                UTI: 'com.microsoft.excel.xlsx'
            });
        }
        return true;
    } catch (error) {
        console.error("Excel Export Error: ", error);
        Alert.alert("Excel Error", String(error));
        throw new Error("Failed to generate Excel file");
    }
}
