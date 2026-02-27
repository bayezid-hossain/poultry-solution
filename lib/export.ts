import { File, Paths } from 'expo-file-system';
import { getContentUriAsync, moveAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import XLSX from 'xlsx-js-style';

/** Format a date as dd/MM/yyyy in local timezone */
function formatLocalDate(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '-';
    // Normalize PostgreSQL timestamptz format: "2026-02-27 18:50:52.745+00" → ISO 8601
    let input: string | Date = dateInput;
    if (typeof input === 'string') {
        input = input.trim().replace(' ', 'T');
        // Ensure timezone offset has colon: "+00" → "+00:00"
        if (/[+-]\d{2}$/.test(input)) input += ':00';
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export interface PDFExportOptions {
    title: string;
    subtitle?: string;
    htmlContent: string;
}

/**
 * Generates a PDF and returns its URI
 */
export async function generatePDF({ title, subtitle, htmlContent }: PDFExportOptions): Promise<string> {
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
                            padding: 12px 8px; 
                            flex: 1; 
                            min-width: 0; 
                            border: 1px solid #e5e7eb;
                            text-align: center;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        }
                        .kpi-value { 
                            font-size: 18px; 
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

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const pdfFile = new File(Paths.document, `${safeTitle}_${Date.now()}.pdf`);

        // Use moveAsync to rename the file correctly
        await moveAsync({
            from: uri,
            to: pdfFile.uri
        });

        return pdfFile.uri;
    } catch (error) {
        console.error("PDF Generation Error: ", error);
        throw new Error("Failed to generate PDF");
    }
}

export interface ExcelExportOptions {
    title: string;
    summaryData: any[];
    rawDataTable?: any[];
    groupedDataTable?: { sectionHeader: string, data: any[], footer?: string }[];
    rawHeaders: string[];
    definitions?: any[];
    mergePrimaryColumn?: boolean;
    extraMerges?: any[];
}

/**
 * Generates an Excel file and returns its URI
 */
export async function generateExcel({ title, summaryData, rawDataTable, groupedDataTable, rawHeaders, definitions = [], mergePrimaryColumn = false, extraMerges = [] }: ExcelExportOptions): Promise<string> {
    try {
        const displayTitle = title.replace(/_/g, ' ').toUpperCase();
        const primaryColor = '10b981'; // Emerald-500

        // ... (styles same as original)
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
            alignment: { horizontal: "center" },
            border: {
                bottom: { style: "medium", color: { rgb: "10b981" } }
            }
        };
        const tableHeaderStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
            fill: { fgColor: { rgb: "10b981" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "medium", color: { rgb: "0d9668" } },
                bottom: { style: "medium", color: { rgb: "0d9668" } },
                left: { style: "thin", color: { rgb: "FFFFFF" } },
                right: { style: "thin", color: { rgb: "FFFFFF" } }
            }
        };
        const cellBorder = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        };
        const centeredStyle = {
            alignment: { horizontal: "center", vertical: "center" },
            border: cellBorder
        };
        const centeredStyleAlt = {
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "F9FAFB" } },
            border: cellBorder
        };

        const L_PAD = 2; // Start from Column C
        const R_PAD = 2; // Extra padding on the right end
        const dataCols = rawHeaders.length + (mergePrimaryColumn ? 1 : 0);
        const dataColsEff = (dataCols % 2 !== 0) ? dataCols + 1 : dataCols;
        const gridWidth = Math.max(6, dataColsEff + (dataColsEff > 6 ? 2 : 0));
        const maxCols = L_PAD + gridWidth + R_PAD;

        const pad = (arr: any[]) => {
            const result = new Array(maxCols).fill("");
            for (let i = 0; i < arr.length; i++) {
                if (L_PAD + i < maxCols) {
                    result[L_PAD + i] = arr[i];
                }
            }
            return result;
        };

        const aoa: any[][] = [
            pad([{ v: displayTitle, s: headerStyle }]),
            pad([{ v: "POULTRY SOLUTION - MANAGEMENT REPORT", s: subheaderStyle }]),
            pad([{ v: `Report Generated: ${new Date().toLocaleString()}`, s: centeredStyle }]),
            pad([]),
            pad([{ v: "[ SUMMARY OVERVIEW ]", s: sectionHeaderStyle }]),
            pad([])
        ];

        const itemsPerRow = summaryData.length;
        const summaryMerges: any[] = [];

        // Distribute itemsPerRow items across gridWidth columns
        const getColInfo = (idx: number) => {
            const startCol = L_PAD + Math.floor((idx * gridWidth) / itemsPerRow);
            const endCol = L_PAD + Math.floor(((idx + 1) * gridWidth) / itemsPerRow) - 1;
            return { startCol, endCol };
        };

        for (let i = 0; i < summaryData.length; i += itemsPerRow) {
            const chunk = summaryData.slice(i, i + summaryData.length);
            const labelRowIndex = aoa.length;
            const valueRowIndex = aoa.length + 1;

            const labelRow = new Array(maxCols).fill("");
            chunk.forEach((item, chunkIdx) => {
                const { startCol, endCol } = getColInfo(chunkIdx);
                labelRow[startCol] = { v: item.Metric.toUpperCase(), s: subheaderStyle };
                summaryMerges.push({
                    s: { r: labelRowIndex, c: startCol },
                    e: { r: labelRowIndex, c: endCol }
                });
            });
            aoa.push(labelRow);

            const valueRow = new Array(maxCols).fill("");
            chunk.forEach((item, chunkIdx) => {
                const { startCol, endCol } = getColInfo(chunkIdx);
                valueRow[startCol] = {
                    v: item.Value,
                    s: {
                        font: { bold: true, sz: 14, color: { rgb: primaryColor } },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } }
                    }
                };
                summaryMerges.push({
                    s: { r: valueRowIndex, c: startCol },
                    e: { r: valueRowIndex, c: endCol }
                });
            });
            aoa.push(valueRow);
            aoa.push(pad([]));
        }

        if (definitions.length > 0) {
            aoa.push(pad([{ v: "[ CALCULATION DEFINITIONS ]", s: sectionHeaderStyle }]));
            aoa.push(pad([{ v: "Metric", s: { font: { italic: true, bold: true } } }, { v: "Calculation", s: { font: { italic: true, bold: true } } }]));
            definitions.forEach(d => {
                aoa.push(pad([d.Metric, d.Calculation]));
            });
            aoa.push(pad([]));
        }

        aoa.push(pad([]));
        aoa.push(pad([]));
        aoa.push(pad([]));
        aoa.push(pad([{ v: "[ DETAILED RECORDS ]", s: sectionHeaderStyle }]));
        aoa.push(pad([]));

        // Calculate offset for centering detail records
        const detailOffset = (gridWidth - dataColsEff) / 2;
        const tableStartCol = L_PAD + detailOffset;

        const detailHeadersRowIndex = aoa.length;
        let detailDataStartRowIndex = aoa.length + 1;

        if (groupedDataTable && groupedDataTable.length > 0) {
            groupedDataTable.forEach((group, gIdx) => {
                if (gIdx > 0) {
                    aoa.push(new Array(maxCols).fill("")); // spacer between tables
                    aoa.push(new Array(maxCols).fill(""));
                }

                // Group Section Header
                const groupHeaderRow = new Array(maxCols).fill("");
                groupHeaderRow[L_PAD] = { v: `[ ${group.sectionHeader} ]`, s: sectionHeaderStyle };
                aoa.push(groupHeaderRow);
                aoa.push(new Array(maxCols).fill("")); // small spacer

                // Column Headers for this group
                const groupColHeaderRow = new Array(maxCols).fill("");
                let currentIdx = tableStartCol;
                if (mergePrimaryColumn) {
                    groupColHeaderRow[currentIdx++] = { v: rawHeaders[0], s: tableHeaderStyle };
                    groupColHeaderRow[currentIdx++] = "";
                    rawHeaders.slice(1).forEach(h => {
                        groupColHeaderRow[currentIdx++] = { v: h, s: tableHeaderStyle };
                    });
                } else {
                    rawHeaders.forEach(h => {
                        groupColHeaderRow[currentIdx++] = { v: h, s: tableHeaderStyle };
                    });
                }
                aoa.push(groupColHeaderRow);

                // Data Rows for this group
                if (gIdx === 0) detailDataStartRowIndex = aoa.length; // track start of first real data block 
                group.data.forEach((obj, rowIdx) => {
                    const dataRow = new Array(maxCols).fill("");
                    let dIdx = tableStartCol;
                    const rowStyle = rowIdx % 2 === 1 ? centeredStyleAlt : centeredStyle;

                    if (mergePrimaryColumn) {
                        dataRow[dIdx++] = { v: obj[rawHeaders[0]], s: rowStyle };
                        dataRow[dIdx++] = "";
                        rawHeaders.slice(1).forEach(h => {
                            dataRow[dIdx++] = { v: obj[h], s: rowStyle };
                        });
                    } else {
                        rawHeaders.forEach(h => {
                            dataRow[dIdx++] = { v: obj[h], s: rowStyle };
                        });
                    }
                    aoa.push(dataRow);
                });

                if (group.footer) {
                    const footerRow = new Array(maxCols).fill("");
                    // Add at L_PAD so it gets picked up by the merge logic at the bottom
                    footerRow[L_PAD] = { v: `[ ${group.footer} ]`, s: sectionHeaderStyle };
                    aoa.push(footerRow);
                }
            });
        } else if (rawDataTable && rawDataTable.length > 0) {
            const headerRow = new Array(maxCols).fill("");
            let currentIdx = tableStartCol;

            if (mergePrimaryColumn) {
                headerRow[currentIdx++] = { v: rawHeaders[0], s: tableHeaderStyle };
                headerRow[currentIdx++] = "";
                rawHeaders.slice(1).forEach(h => {
                    headerRow[currentIdx++] = { v: h, s: tableHeaderStyle };
                });
            } else {
                rawHeaders.forEach(h => {
                    headerRow[currentIdx++] = { v: h, s: tableHeaderStyle };
                });
            }
            aoa.push(headerRow);

            detailDataStartRowIndex = aoa.length;
            rawDataTable.forEach((obj, rowIdx) => {
                const dataRow = new Array(maxCols).fill("");
                let dIdx = tableStartCol;
                const rowStyle = rowIdx % 2 === 1 ? centeredStyleAlt : centeredStyle;

                if (mergePrimaryColumn) {
                    dataRow[dIdx++] = { v: obj[rawHeaders[0]], s: rowStyle };
                    dataRow[dIdx++] = "";
                    rawHeaders.slice(1).forEach(h => {
                        dataRow[dIdx++] = { v: obj[h], s: rowStyle };
                    });
                } else {
                    rawHeaders.forEach(h => {
                        dataRow[dIdx++] = { v: obj[h], s: rowStyle };
                    });
                }
                aoa.push(dataRow);
            });
        }
        const detailDataEndRowIndex = aoa.length - 1;

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        const merges: any[] = [
            { s: { r: 0, c: L_PAD }, e: { r: 0, c: L_PAD + gridWidth - 1 } },
            { s: { r: 1, c: L_PAD }, e: { r: 1, c: L_PAD + gridWidth - 1 } },
            { s: { r: 2, c: L_PAD }, e: { r: 2, c: L_PAD + gridWidth - 1 } },
            ...summaryMerges,
            ...extraMerges
        ];

        // Detailed records merges
        for (let r = detailHeadersRowIndex; r <= detailDataEndRowIndex; r++) {
            if (mergePrimaryColumn) {
                merges.push({ s: { r: r, c: tableStartCol }, e: { r: r, c: tableStartCol + 1 } });
            }
            if (dataColsEff > dataCols) {
                const lastColIdx = tableStartCol + dataCols - 1;
                merges.push({ s: { r: r, c: lastColIdx }, e: { r: r, c: lastColIdx + 1 } });
            }
        }

        aoa.forEach((row, rowIndex) => {
            const targetCell = row[L_PAD];
            if (targetCell && typeof targetCell === 'object' && 'v' in targetCell && typeof targetCell.v === 'string') {
                if (targetCell.v.startsWith('[ ') && targetCell.v.endsWith(' ]')) {
                    merges.push({ s: { r: rowIndex, c: L_PAD }, e: { r: rowIndex, c: L_PAD + gridWidth - 1 } });
                }
            }
        });

        worksheet['!merges'] = merges;

        const firstHeader = (rawHeaders[0] || "").toLowerCase();
        const isFarmerCol = firstHeader.includes('farmer') || firstHeader === 'name';

        const wscols = [];
        for (let i = 0; i < maxCols; i++) {
            let defaultWidth = (i < L_PAD) ? 2 : 8;
            if (i === tableStartCol && isFarmerCol) defaultWidth = 22; // Wider default for names

            let maxLen = defaultWidth;
            aoa.forEach((row, rowIndex) => {
                if (row && row[i] !== undefined) {
                    const cell = row[i];
                    const val = (cell && typeof cell === 'object' && 'v' in cell) ? String(cell.v) : String(cell);

                    if (val && val !== 'undefined' && val.length > maxLen) {
                        // SKIP width contribution from horizontally merged cells
                        // 1. Titles & Date Rows (First 3 rows) - Skip if it's the anchor col for a title
                        if (rowIndex < 3 && i >= L_PAD && i < L_PAD + gridWidth) return;
                        // 2. Section Headers ([ TITLE ])
                        if (val.startsWith('[ ') && val.endsWith(' ]')) return;
                        // 3. Summary labels/values (merged cells)
                        if (rowIndex >= 4 && rowIndex < detailHeadersRowIndex - 1) {
                            const merge = summaryMerges.find(m => m.s.r === rowIndex && i >= m.s.c && i <= m.e.c);
                            if (merge && i !== merge.s.c) return;
                        }

                        if (i === tableStartCol && mergePrimaryColumn) {
                            maxLen = Math.max(maxLen, Math.floor(val.length * 0.6));
                        } else {
                            maxLen = val.length;
                        }
                    }
                }
            });

            // Logic for column widths:
            // Data columns (between L_PAD and R_PAD boundaries) should fit content + margin.
            // Padding columns (A, B and last few) should stay extremely narrow.
            const isDataCol = i >= L_PAD && i < (L_PAD + gridWidth);
            const wch = isDataCol ? Math.min(Math.max(maxLen + 2, defaultWidth), 100) : 2;
            wscols.push({ wch });
        }
        worksheet['!cols'] = wscols;

        // Row heights: taller for detail data rows, header rows
        const wsrows: any[] = [];
        for (let r = 0; r < aoa.length; r++) {
            if (r === 0) {
                wsrows.push({ hpt: 28 }); // Title row
            } else if (r === detailHeadersRowIndex) {
                wsrows.push({ hpt: 24 }); // Detail header row
            } else if (r >= detailDataStartRowIndex && r <= detailDataEndRowIndex) {
                wsrows.push({ hpt: 22 }); // Detail data rows - taller for readability
            } else {
                wsrows.push({}); // Default
            }
        }
        worksheet['!rows'] = wsrows;

        const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const uint8Array = new Uint8Array(wbout);
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const file = new File(Paths.document, `${safeTitle}_${Date.now()}.xlsx`);
        await file.write(uint8Array);

        return file.uri;
    } catch (error) {
        console.error("Excel Generation Error: ", error);
        throw new Error("Failed to generate Excel file");
    }
}

/**
 * Direct native viewing of a file
 */
export async function openFile(uri: string, mimeType: string) {
    try {
        if (Platform.OS === 'android') {
            const contentUri = await getContentUriAsync(uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1,
                type: mimeType,
            });
        } else {
            // iOS has built-in QuickLook in share menu, so we use share but it shows preview
            await Sharing.shareAsync(uri);
        }
    } catch (error) {
        console.error("Open File Error: ", error);
        Alert.alert("Error", "Could not open file viewer. Please make sure you have a compatible app installed.");
    }
}

/**
 * Opens system share dialog
 */
export async function shareFile(uri: string, title: string, mimeType: string, UTI?: string) {
    try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, {
                mimeType,
                dialogTitle: `Share ${title}`,
                UTI
            });
        }
    } catch (error) {
        console.error("Share File Error: ", error);
        Alert.alert("Error", "Failed to open sharing dialog.");
    }
}

/**
 * Generates an Excel report for active stock/farmers
 */
export async function exportActiveStockExcel(activeCycles: any[], title: string) {
    const rawHeaders = ["Farmer", "DOC", "Age", "Main Stock (bags)", "Last Updated"];

    // Grouping logic
    const groups: Record<string, any[]> = {};
    activeCycles.forEach(c => {
        const key = c.farmerName || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    });

    const rawDataTable: any[] = [];
    const extraMerges: any[] = [];
    let startRowOffset = 15; // Details section starts at index 15

    Object.entries(groups).forEach(([farmerName, cycles]) => {
        const startRow = startRowOffset + rawDataTable.length;
        cycles.forEach((c, idx) => {
            rawDataTable.push({
                "Farmer": idx === 0 ? farmerName : "",
                "DOC": c.doc,
                "Age": c.age,
                "Main Stock (bags)": Number(c.farmerMainStock).toFixed(2),
                "Last Updated": formatLocalDate(c.mainStockUpdatedAt || c.farmerUpdatedAt || c.updatedAt)
            });
        });

        if (cycles.length > 1) {
            extraMerges.push({
                s: { r: startRow, c: 2 }, // Column C (L_PAD=2)
                e: { r: startRow + cycles.length - 1, c: 2 }
            });
        }
    });

    // Unique main stock calculation (using a Map to avoid double counting farmers with multiple cycles)
    const uniqueFarmersMap = new Map();
    activeCycles.forEach(c => {
        if (!uniqueFarmersMap.has(c.farmerId)) {
            uniqueFarmersMap.set(c.farmerId, c.farmerMainStock || 0);
        }
    });
    const totalStock = Array.from(uniqueFarmersMap.values()).reduce((sum, stock) => sum + stock, 0);

    const summaryData = [
        { Metric: "Farmers", Value: Object.keys(groups).length },
        { Metric: "DOC", Value: activeCycles.reduce((acc, c) => acc + (c.doc || 0), 0) },
        { Metric: "Live Birds", Value: activeCycles.reduce((acc, c) => acc + ((c.doc || 0) - (c.mortality || 0) - (c.birdsSold || 0)), 0) },
        { Metric: "Stock (bags)", Value: totalStock.toFixed(1) }
    ];

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        rawDataTable,
        extraMerges
    });
}

/**
 * Generates a PDF report for active stock/farmers
 */
export async function exportActiveStockPDF(activeCycles: any[], title: string) {
    const groups: Record<string, any[]> = {};
    activeCycles.forEach(c => {
        const key = c.farmerName || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    });

    const headerHtml = `
        <thead>
            <tr>
                <th style="width: 30%">Farmer</th>
                <th>DOC</th>
                <th>Age</th>
                <th>Main Stock (b)</th>
                <th>Last Updated</th>
            </tr>
        </thead>
    `;

    const bodyHtml = `
        <tbody>
            ${Object.entries(groups).map(([farmerName, cycles]) => `
                ${cycles.map((c, idx) => `
                    <tr>
                        ${idx === 0
            ? `<td rowspan="${cycles.length}" style="font-weight: bold; vertical-align: middle; border: 1px solid #e5e7eb;">${farmerName}</td>`
            : ''
        }
                        <td style="border: 1px solid #e5e7eb;">${c.doc}</td>
                        <td style="border: 1px solid #e5e7eb;">${c.age}</td>
                        <td style="border: 1px solid #e5e7eb;">${Number(c.farmerMainStock).toFixed(2)}</td>
                        <td style="border: 1px solid #e5e7eb;">${formatLocalDate(c.mainStockUpdatedAt || c.farmerUpdatedAt || c.updatedAt)}</td>
                    </tr>
                `).join('')}
            `).join('')}
        </tbody>
    `;

    // Unique main stock calculation
    const uniqueFarmersMap = new Map();
    activeCycles.forEach(c => {
        if (!uniqueFarmersMap.has(c.farmerId)) {
            uniqueFarmersMap.set(c.farmerId, c.farmerMainStock || 0);
        }
    });
    const totalStock = Array.from(uniqueFarmersMap.values()).reduce((sum, stock) => sum + stock, 0);

    const htmlContent = `
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">${Object.keys(groups).length}</div>
                <div class="kpi-label">Active Farmers</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${activeCycles.reduce((acc, c) => acc + (c.doc || 0), 0).toLocaleString()}</div>
                <div class="kpi-label">Total DOC</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${activeCycles.reduce((acc, c) => acc + ((c.doc || 0) - (c.mortality || 0) - (c.birdsSold || 0)), 0).toLocaleString()}</div>
                <div class="kpi-label">Total Live Birds</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${totalStock.toFixed(1)}</div>
                <div class="kpi-label">Total Stock (bags)</div>
            </div>
        </div>
        <table>
            ${headerHtml}
            ${bodyHtml}
        </table>
    `;

    return await generatePDF({
        title,
        htmlContent
    });
}

/**
 * Generates an Excel report for DOC placements within a date range
 * Groups details by month/year with monthly sub-totals
 */
export async function exportRangeDocPlacementsExcel(data: any, title: string) {
    const rawHeaders = ["Farmer", "Batch #", "Date", "DOC", "Status"];

    // Flatten all cycles with farmer name and parse dates
    const allCycles: any[] = [];
    (data.farmers || []).forEach((f: any) => {
        const sortedCycles = [...f.cycles].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const monthBatchCount: Record<string, number> = {};
        sortedCycles.forEach((c: any) => {
            const d = new Date(c.date);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!monthBatchCount[monthKey]) monthBatchCount[monthKey] = 0;
            monthBatchCount[monthKey]++;

            allCycles.push({
                farmerName: f.farmerName,
                batchNum: monthBatchCount[monthKey],
                date: d,
                doc: c.doc,
                status: c.status,
                monthKey,
                monthLabel: d.toLocaleString('default', { month: 'long', year: 'numeric' })
            });
        });
    });

    // Sort by date
    allCycles.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by month
    const monthGroups: Record<string, typeof allCycles> = {};
    allCycles.forEach(c => {
        if (!monthGroups[c.monthKey]) monthGroups[c.monthKey] = [];
        monthGroups[c.monthKey].push(c);
    });

    // Sort within each month: by farmer name first, then by date
    Object.values(monthGroups).forEach(group => {
        group.sort((a, b) => a.farmerName.localeCompare(b.farmerName) || a.date.getTime() - b.date.getTime());
    });

    // Build grouped data table
    const groupedDataTable: any[] = [];
    Object.entries(monthGroups).forEach(([, cycles]) => {
        const monthDoc = cycles.reduce((s, c) => s + c.doc, 0);
        const sectionHeader = `${cycles[0].monthLabel} — ${cycles.length} batches, ${monthDoc.toLocaleString()} DOC`;

        const data = cycles.map(c => ({
            "Farmer": c.farmerName,
            "Batch #": c.batchNum,
            "Date": formatLocalDate(c.date),
            "DOC": c.doc,
            "Status": c.status === 'archived' || c.status === 'completed' ? 'Archived' : 'Active'
        }));

        groupedDataTable.push({ sectionHeader, data });
    });

    const summaryData = [
        { Metric: "Total DOC Placed", Value: data.summary?.totalDoc ?? 0 },
        { Metric: "Total Farmers", Value: data.summary?.farmerCount ?? 0 },
        { Metric: "Total Batches", Value: data.summary?.cycleCount ?? 0 }
    ];

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        groupedDataTable,
        mergePrimaryColumn: true
    });
}

/**
 * Generates a PDF report for DOC placements within a date range
 * Groups details by month/year with monthly sub-totals
 */
export async function exportRangeDocPlacementsPDF(data: any, title: string) {
    const { summary, farmers } = data;

    // Flatten all cycles with farmer context
    const allCycles: any[] = [];
    (farmers || []).forEach((f: any) => {
        const sortedCycles = [...f.cycles].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const monthBatchCount: Record<string, number> = {};
        sortedCycles.forEach((c: any) => {
            const d = new Date(c.date);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!monthBatchCount[monthKey]) monthBatchCount[monthKey] = 0;
            monthBatchCount[monthKey]++;

            allCycles.push({
                farmerName: f.farmerName,
                batchNum: monthBatchCount[monthKey],
                date: d,
                doc: c.doc,
                status: c.status,
                monthKey,
                monthLabel: d.toLocaleString('default', { month: 'long', year: 'numeric' })
            });
        });
    });
    allCycles.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by month
    const monthGroups: Record<string, typeof allCycles> = {};
    allCycles.forEach(c => {
        if (!monthGroups[c.monthKey]) monthGroups[c.monthKey] = [];
        monthGroups[c.monthKey].push(c);
    });

    // Sort within each month: by farmer name first, then by date
    Object.values(monthGroups).forEach(group => {
        group.sort((a, b) => a.farmerName.localeCompare(b.farmerName) || a.date.getTime() - b.date.getTime());
    });

    // Build month sections
    const monthSections = Object.values(monthGroups).map(cycles => {
        const monthDoc = cycles.reduce((s, c) => s + c.doc, 0);
        return `
            <div class="section-title">${cycles[0].monthLabel} — ${cycles.length} batches, ${monthDoc.toLocaleString()} DOC</div>
            <table>
                <thead>
                    <tr>
                        <th>Farmer</th>
                        <th>Batch #</th>
                        <th>Date</th>
                        <th>DOC</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${cycles.map(c => `
                        <tr>
                            <td style="font-weight: bold;">${c.farmerName}</td>
                            <td>${c.batchNum}</td>
                            <td>${formatLocalDate(c.date)}</td>
                            <td style="font-weight: bold;">${c.doc.toLocaleString()}</td>
                            <td>${c.status === 'archived' || c.status === 'completed' ? 'Archived' : 'Active'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }).join('');

    const htmlContent = `
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">${(summary?.totalDoc ?? 0).toLocaleString()}</div>
                <div class="kpi-label">Total DOC Placed</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${summary?.farmerCount ?? 0}</div>
                <div class="kpi-label">Total Farmers</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${summary?.cycleCount ?? 0}</div>
                <div class="kpi-label">Total Batches</div>
            </div>
        </div>
        ${monthSections}
    `;
    return await generatePDF({ title, htmlContent });
}

/**
 * Generates an Excel report for monthly production records within a range
 */
export async function exportRangeProductionExcel(records: any[], title: string) {
    const rawHeaders = ["Farmer", "DOC", "Surv. %", "Avg Wt (kg)", "FCR", "EPI", "Age", "Net Profit"];

    // Group by month
    const monthGroups: Record<string, any[]> = {};
    records.forEach(r => {
        const key = r.monthKey;
        if (!monthGroups[key]) monthGroups[key] = [];
        monthGroups[key].push(r);
    });

    const groupedDataTable: any[] = [];
    Object.entries(monthGroups).forEach(([key, groupRecords]) => {
        const monthTotalDoc = groupRecords.reduce((s, c) => s + c.doc, 0);
        const sectionHeader = `${groupRecords[0].monthName} ${groupRecords[0].year} — ${groupRecords.length} batches, ${monthTotalDoc.toLocaleString()} DOC`;

        const monthProfit = groupRecords.reduce((sum, r) => sum + r.profit, 0);
        const monthAvgFcr = groupRecords.length > 0 ? (groupRecords.reduce((sum, r) => sum + r.fcr, 0) / groupRecords.length).toFixed(2) : "0.00";
        const monthAvgEpi = groupRecords.length > 0 ? (groupRecords.reduce((sum, r) => sum + r.epi, 0) / groupRecords.length).toFixed(2) : "0.00";
        const footer = `${groupRecords[0].monthName} Averages: EPI ${monthAvgEpi} | FCR ${monthAvgFcr} | Total Profit: ৳${monthProfit.toLocaleString()}`;

        const data = groupRecords.map(r => ({
            "Farmer": r.farmerName,
            "DOC": r.doc,
            "Surv. %": (r.survivalRate || 0).toFixed(1) + "%",
            "Avg Wt (kg)": (r.averageWeight || 0).toFixed(3),
            "FCR": (r.fcr || 0).toFixed(2),
            "EPI": (r.epi || 0).toFixed(2),
            "Age": (r.age || 0).toFixed(1),
            "Net Profit": r.profit
        }));
        groupedDataTable.push({ sectionHeader, data, footer });
    });

    const summaryData = [
        { Metric: "Total DOC In", Value: records.reduce((sum, r) => sum + r.doc, 0) },
        { Metric: "Average FCR", Value: records.length > 0 ? (records.reduce((sum, r) => sum + r.fcr, 0) / records.length).toFixed(3) : "0.000" },
        { Metric: "Average EPI", Value: records.length > 0 ? (records.reduce((sum, r) => sum + r.epi, 0) / records.length).toFixed(2) : "0.00" },
        { Metric: "Net Profit", Value: "৳" + records.reduce((sum, r) => sum + r.profit, 0).toLocaleString() }
    ];

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        groupedDataTable,
        mergePrimaryColumn: true
    });
}

/**
 * Generates a PDF report for monthly production records within a range
 * Each month shown as separate section with header
 */
export async function exportRangeProductionPDF(records: any[], title: string) {
    const totalIn = records.reduce((sum, r) => sum + r.doc, 0);
    const avgFCR = records.length > 0 ? (records.reduce((sum, r) => sum + r.fcr, 0) / records.length) : 0;
    const avgEPI = records.length > 0 ? (records.reduce((sum, r) => sum + r.epi, 0) / records.length) : 0;
    const totalProfit = records.reduce((sum, r) => sum + r.profit, 0);

    // Group by month
    const monthGroups: Record<string, any[]> = {};
    records.forEach(r => {
        const key = r.monthKey;
        if (!monthGroups[key]) monthGroups[key] = [];
        monthGroups[key].push(r);
    });

    // Build per-month sections
    const monthSections = Object.values(monthGroups).map(groupRecords => {
        const monthTotalDoc = groupRecords.reduce((s, c) => s + c.doc, 0);
        const monthProfit = groupRecords.reduce((sum, r) => sum + r.profit, 0);
        const monthAvgFcr = groupRecords.length > 0 ? (groupRecords.reduce((sum, r) => sum + r.fcr, 0) / groupRecords.length).toFixed(2) : "0.00";
        const monthAvgEpi = groupRecords.length > 0 ? (groupRecords.reduce((sum, r) => sum + r.epi, 0) / groupRecords.length).toFixed(2) : "0.00";

        return `
        <table style="margin-bottom: 20px;">
            <thead>
                <tr>
                    <th colspan="8" style="background-color: #f9fafb; color: #374151; font-size: 13px; font-weight: 900; letter-spacing: 0.05em; padding: 12px; border-bottom: 2px solid #10b981; text-align: center;">
                        ${groupRecords[0].monthName.toUpperCase()} ${groupRecords[0].year} — ${groupRecords.length} BATCHES, ${monthTotalDoc.toLocaleString()} DOC
                    </th>
                </tr>
                <tr>
                    <th>Farmer</th><th>DOC</th><th>Surv. %</th>
                    <th>Avg Wt (kg)</th><th>FCR</th><th>EPI</th><th>Age</th><th>Net Profit</th>
                </tr>
            </thead>
            <tbody>
                ${groupRecords.map(r => `
                <tr>
                    <td style="font-weight: bold;">${r.farmerName}</td>
                    <td>${r.doc.toLocaleString()}</td>
                    <td>${(r.survivalRate || 0).toFixed(1)}%</td>
                    <td>${(r.averageWeight || 0).toFixed(3)}</td>
                    <td style="font-family: monospace;">${(r.fcr || 0).toFixed(2)}</td>
                    <td style="font-family: monospace;">${(r.epi || 0).toFixed(2)}</td>
                    <td>${(r.age || 0).toFixed(1)}</td>
                    <td style="color: ${r.profit >= 0 ? '#16a34a' : '#dc2626'}; white-space: nowrap;">৳${r.profit.toLocaleString()}</td>
                </tr>
                `).join('')}
                <tr>
                    <td colspan="8" style="text-align: center; font-weight: 800; background-color: #f3f4f6; color: #1f2937; padding: 12px; letter-spacing: 0.05em; font-size: 11px; border-top: 2px solid #e5e7eb;">
                        ${groupRecords[0].monthName.toUpperCase()} AVERAGES: <span style="color: #10b981; margin: 0 8px;">EPI ${monthAvgEpi}</span> &bull; <span style="color: #10b981; margin: 0 8px;">FCR ${monthAvgFcr}</span> &bull; <span style="color: ${monthProfit >= 0 ? '#10b981' : '#dc2626'}; margin-left: 8px;">PROFIT: ৳${monthProfit.toLocaleString()}</span>
                    </td>
                </tr>
            </tbody>
        </table>
        `;
    }).join('');

    const htmlContent = `
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">${totalIn.toLocaleString()}</div>
                <div class="kpi-label">Total DOC In</div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-value">${avgFCR.toFixed(3)}</div>
                <div class="kpi-label">Average FCR</div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-value">${avgEPI.toFixed(2)}</div>
                <div class="kpi-label">Average EPI</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value" style="color: ${totalProfit >= 0 ? '#16a34a' : '#dc2626'}">৳${totalProfit.toLocaleString()}</div>
                <div class="kpi-label">Net Profit</div>
            </div>
        </div>
        ${monthSections}

        <div class="footer">
            <p><b>FCR (Feed Conversion Ratio)</b> = Total Feed Consumed / Total Weight Gain</p>
            <p><b>EPI (European Production Index)</b> = (Survival % × Body Weight) / (Age × FCR) × 10</p>
        </div>
    `;

    return await generatePDF({ title, htmlContent });
}

/**
 * Generates an Excel report for annual performance breakdown
 * Matches the original performance.tsx exportExcel logic exactly
 */
export async function exportYearlyPerformanceExcel(data: any, title: string) {
    const rawHeaders = ["Month", "Chicks In", "Sold", "Avg Age (days)", "Total Weight (kg)", "Feed (kg)", "Survival %", "EPI", "FCR", "Avg Price"];
    const rawDataTable = (data.monthlyData || []).map((m: any, idx: number) => ({
        "Month": m.month || ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][idx],
        "Chicks In": m.chicksIn,
        "Sold": m.chicksSold,
        "Avg Age (days)": m.averageAge > 0 ? Math.round(m.averageAge) : 0,
        "Total Weight (kg)": m.totalBirdWeight,
        "Feed (kg)": m.feedConsumption,
        "Survival %": m.survivalRate > 0 ? (m.survivalRate).toFixed(1) : 0,
        "EPI": m.epi > 0 ? Math.round(m.epi) : 0,
        "FCR": m.fcr > 0 ? Number(m.fcr.toFixed(3)) : 0,
        "Avg Price": m.averagePrice.toFixed(2)
    }));

    const summaryData = [
        { Metric: "Total DOC Placed", Value: (data.totalChicksIn || 0) },
        { Metric: "Total Sold", Value: (data.totalChicksSold || 0) },
        { Metric: "Average FCR", Value: (data.averageFCR || 0).toFixed(2) },
        { Metric: "Average EPI", Value: (data.averageEPI || 0).toFixed(0) },
        { Metric: "Average Survival Rate", Value: (data.averageSurvivalRate).toFixed(1) + "%" }
    ];

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        rawDataTable,
        definitions: [
            { Metric: "Avg. Selling Price", Calculation: "Total Revenue / Total Weight" },
            { Metric: "Farmer Effective Rate", Calculation: "max(Base Rate, Base Rate + Summation of Adjustments)" },
            { Metric: "Summation of Adjustments", Calculation: "Σ [(Sale Price - Base Rate) * (0.5 if surplus else 1.0) * Weight] / Total Weight" },
            { Metric: "FCR", Calculation: "(Total Feed Bags × 50) / Total Live Weight (kg)" },
            { Metric: "EPI", Calculation: "(Survival% × Avg Weight kg) / (FCR × Age days) × 100" },
            { Metric: "Survival Rate", Calculation: "((House Birds - Total Mortality) / House Birds) × 100" },
            { Metric: "Avg Weight", Calculation: "Total Live Weight (kg) / Total Birds Sold" },
            { Metric: "Feed Cost", Calculation: "Total Feed Bags × Feed Price Per Bag" },
            { Metric: "DOC Cost", Calculation: "Total DOC Placed × DOC Price Per Bird" },
            { Metric: "Profit", Calculation: "(Total Weight × Effective Rate) - (Feed Cost + DOC Cost)" }
        ]
    });
}

/**
 * Generates a PDF report for annual performance breakdown
 * Matches the original performance.tsx exportPdf logic exactly
 */
export async function exportYearlyPerformancePDF(data: any, title: string) {
    const MONTHS_SHORT = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const fmtNum = (v: number | undefined | null) => {
        if (v === null || v === undefined || isNaN(v)) return '0';
        return v.toLocaleString();
    };
    const fmtDec = (v: number | undefined | null, decimals = 2) => {
        if (v === null || v === undefined || isNaN(v)) return '0';
        return v.toFixed(decimals);
    };
    const fmtPct = (v: number | undefined | null) => {
        if (v === null || v === undefined || isNaN(v)) return '0%';
        return (v * 100).toFixed(1) + '%';
    };

    const soldPercent = data.totalChicksIn > 0 ? ((data.totalChicksSold / data.totalChicksIn) * 100).toFixed(0) : "0";

    const getFCRLabel = (fcr: number) => {
        if (fcr <= 0) return { label: 'N/A' };
        if (fcr <= 1.5) return { label: 'Excellent' };
        if (fcr <= 1.7) return { label: 'Good' };
        if (fcr <= 2.0) return { label: 'Average' };
        return { label: 'Below Average' };
    };
    const fcrLabel = getFCRLabel(data.averageFCR || 0);

    const year = data.year || new Date().getFullYear();

    const htmlContent = `
        <div class="section-title">Summary Performance Overview - ${year}</div>
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">${fmtNum(data.totalChicksIn)}</div>
                <div class="kpi-label">Total DOC Placed</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${fmtNum(data.totalChicksSold)}</div>
                <div class="kpi-label">Total Sold</div>
                <div style="font-size:10px;color:#6b7280;margin-top:2px">${soldPercent}% of total placed</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${fmtDec(data.averageFCR)}</div>
                <div class="kpi-label">Average FCR</div>
                <div style="font-size:10px;color:#6b7280;margin-top:2px">${fcrLabel?.label || ''}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${fmtDec(data.averageEPI, 0)}</div>
                <div class="kpi-label">Average EPI</div>
                <div style="font-size:10px;color:#6b7280;margin-top:2px">${fmtPct(data.averageSurvivalRate)} survival rate</div>
            </div>
        </div>

        <div class="section-title">Monthly Performance Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Chicks In</th>
                    <th>Sold</th>
                    <th>Age (d)</th>
                    <th>Weight (kg)</th>
                    <th>Feed (kg)</th>
                    <th>SR%</th>
                    <th>EPI</th>
                    <th>FCR</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                ${(data.monthlyData || []).map((m: any, idx: number) => `
                    <tr>
                        <td>${MONTHS_SHORT[idx]}</td>
                        <td>${m.chicksIn}</td>
                        <td>${m.chicksSold}</td>
                        <td>${m.averageAge > 0 ? Math.round(m.averageAge) : '-'}</td>
                        <td>${m.totalBirdWeight > 0 ? Math.round(m.totalBirdWeight) : '-'}</td>
                        <td>${m.feedConsumption > 0 ? Math.round(m.feedConsumption) : '-'}</td>
                        <td>${m.survivalRate > 0 ? (m.survivalRate).toFixed(1) + '%' : '-'}</td>
                        <td>${m.epi > 0 ? Math.round(m.epi) : '-'}</td>
                        <td>${m.fcr > 0 ? m.fcr.toFixed(2) : '-'}</td>
                        <td>${m.averagePrice > 0 ? m.averagePrice.toFixed(2) : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p><b>FCR (Feed Conversion Ratio)</b> = Total Feed Consumed / Total Weight Gain</p>
            <p><b>EPI (European Production Index)</b> = (Survival % × Body Weight) / (Age × FCR) × 10</p>
        </div>
    `;

    return await generatePDF({ title, htmlContent });
}


/**
 * Generates an Excel report for all farmers and their current main stock
 */
export async function exportAllFarmerStockExcel(farmers: any[], title: string) {
    const rawHeaders = ["Farmer Name", "Location", "Mobile", "Main Stock (bags)", "Active Cycles", "Last Updated"];
    const rawDataTable = farmers.map(f => ({
        "Farmer Name": f.name || '---',
        "Location": f.location || '---',
        "Mobile": f.mobile || '---',
        "Main Stock (bags)": Number(f.mainStock || 0).toFixed(2),
        "Active Cycles": f.activeCyclesCount || 0,
        "Last Updated": formatLocalDate(f.mainStockUpdatedAt || f.updatedAt)
    }));

    const summaryData = [
        { Metric: "Total Farmers", Value: farmers.length },
        { Metric: "Total Stock (b)", Value: farmers.reduce((sum, f) => sum + (Number(f.mainStock) || 0), 0).toFixed(1) },
        { Metric: "With Active Cycles", Value: farmers.filter(f => f.activeCyclesCount > 0).length }
    ];

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        rawDataTable
    });
}

/**
 * Generates a PDF report for all farmers and their current main stock
 */
export async function exportAllFarmerStockPDF(farmers: any[], title: string) {
    const htmlContent = `
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">${farmers.length}</div>
                <div class="kpi-label">Total Farmers</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${farmers.reduce((sum, f) => sum + (Number(f.mainStock) || 0), 0).toFixed(1)}</div>
                <div class="kpi-label">Total Stock (bags)</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${farmers.filter(f => f.activeCyclesCount > 0).length}</div>
                <div class="kpi-label">Active Cycles</div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Farmer Name</th>
                    <th>Location</th>
                    <th>Mobile</th>
                    <th>Stock (bags)</th>
                    <th>Active Cycles</th>
                    <th>Last Updated</th>
                </tr>
            </thead>
            <tbody>
                ${farmers.map(f => `
                    <tr>
                        <td style="text-align: left; font-weight: bold;">${f.name}</td>
                        <td>${f.location || '---'}</td>
                        <td>${f.mobile || '---'}</td>
                        <td style="font-weight: bold;">${Number(f.mainStock || 0).toFixed(2)}</td>
                        <td>${f.activeCyclesCount || 0}</td>
                        <td>${formatLocalDate(f.mainStockUpdatedAt || f.updatedAt)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return await generatePDF({ title, htmlContent });
}

/**
 * Generates an Excel report for the sales ledger
 * Matches the original sales.tsx exportExcel logic exactly
 */
export async function exportSalesLedgerExcel(sales: any[], title: string) {
    let totalRevenue = 0; let totalBirds = 0; let totalWeight = 0; let totalProfit = 0;

    // Grouping to identify latest sale per cycle
    const cycleSalesMap: Record<string, string[]> = {};
    sales.forEach((s: any) => {
        const key = s.cycleId || s.historyId || "unknown";
        if (!cycleSalesMap[key]) cycleSalesMap[key] = [];
        cycleSalesMap[key].push(s.id);
    });

    sales.forEach((s: any) => {
        const revenue = s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0;
        totalRevenue += revenue;
        totalBirds += s.birdsSold || 0;
        totalWeight += Number(s.totalWeight) || 0;
        if (s.cycleContext?.isEnded && s.reports?.[0]?.id === s.selectedReportId) {
            totalProfit += s.cycleContext.profit || 0;
        }
    });

    const summaryData = [
        { Metric: "Total Revenue", Value: `৳${totalRevenue.toLocaleString()}` },
        { Metric: "Birds Sold", Value: totalBirds.toLocaleString() },
        { Metric: "Total Weight", Value: `${totalWeight.toFixed(2)} kg` },
        { Metric: "Net Profit", Value: `৳${totalProfit.toLocaleString()}` }
    ];

    const rawHeaders = [
        "Farmer", "Date", "Age", "Birds Sold", "Total Weight (kg)",
        "Price/kg", "Revenue", "Cash", "Deposit", "Medicine", "Feed (Bags)",
        "Mortality", "FCR", "EPI", "Profit"
    ];

    // Helper to build a sale row
    const buildSaleRow = (s: any) => {
        const ctx = s.cycleContext;
        const isEnded = ctx?.isEnded;
        const isLatest = cycleSalesMap[s.cycleId || s.historyId || "unknown"]?.[0] === s.id;
        const showWeighted = isEnded && isLatest;

        const feedConsumed = s.feedConsumed || s.reports?.[0]?.feedConsumed;
        let feedTotal = 0;
        try {
            const parsed = typeof feedConsumed === 'string' ? JSON.parse(feedConsumed) : feedConsumed;
            if (Array.isArray(parsed)) feedTotal = parsed.reduce((sum: number, f: any) => sum + (Number(f.bags) || 0), 0);
        } catch (e) { }

        return {
            Farmer: s.farmerName || s.cycle?.farmer?.name || s.history?.farmer?.name || "-",
            Date: formatLocalDate(s.saleDate || s.createdAt),
            Age: showWeighted ? `${ctx.age} (Weighted)` : (s.saleAge ?? ctx?.age ?? "N/A"),
            "Birds Sold": s.birdsSold,
            "Total Weight (kg)": Number(s.totalWeight).toFixed(2),
            "Price/kg": `৳${s.pricePerKg}`,
            Revenue: `৳${(s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0).toLocaleString()}`,
            Cash: `৳${(s.cashReceived || 0).toLocaleString()}`,
            Deposit: `৳${(s.depositReceived || 0).toLocaleString()}`,
            Medicine: `৳${(s.medicineCost || 0).toLocaleString()}`,
            "Feed (Bags)": feedTotal || "-",
            Mortality: showWeighted ? ctx.mortality : "-",
            FCR: showWeighted ? ctx.fcr : "-",
            EPI: showWeighted ? ctx.epi : "-",
            Profit: showWeighted ? `৳${Math.round(ctx?.profit || 0).toLocaleString()}` : "-"
        };
    };

    // Sort sales by date and group by month/year
    const sortedSales = [...sales].sort((a, b) => new Date(a.saleDate || a.createdAt).getTime() - new Date(b.saleDate || b.createdAt).getTime());
    const monthGroups: Record<string, { label: string, sales: any[] }> = {};
    sortedSales.forEach(s => {
        const d = new Date(s.saleDate || s.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!monthGroups[key]) monthGroups[key] = { label: d.toLocaleString('default', { month: 'long', year: 'numeric' }), sales: [] };
        monthGroups[key].sales.push(s);
    });

    // Build grouped data table
    const groupedDataTable: any[] = [];
    Object.values(monthGroups).forEach(group => {
        const monthRevenue = group.sales.reduce((sum, s) => sum + (s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0), 0);
        const monthBirds = group.sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
        const sectionHeader = `${group.label} — ${group.sales.length} sales, ${monthBirds.toLocaleString()} birds, ৳${monthRevenue.toLocaleString()}`;

        const data = group.sales.map(s => buildSaleRow(s));
        groupedDataTable.push({ sectionHeader, data });
    });

    return await generateExcel({
        title,
        summaryData,
        rawHeaders,
        groupedDataTable,
        mergePrimaryColumn: true,
        definitions: [
            { Metric: "Avg. Selling Price", Calculation: "Total Revenue / Total Weight" },
            { Metric: "Farmer Effective Rate", Calculation: "max(Base Rate, Base Rate + Summation of Adjustments)" },
            { Metric: "Summation of Adjustments", Calculation: "Σ [(Sale Price - Base Rate) * (0.5 if surplus else 1.0) * Weight] / Total Weight" },
            { Metric: "FCR", Calculation: "(Total Feed Bags × 50) / Total Live Weight (kg)" },
            { Metric: "EPI", Calculation: "(Survival% × Avg Weight kg) / (FCR × Age days) × 100" },
            { Metric: "Survival Rate", Calculation: "((House Birds - Total Mortality) / House Birds) × 100" },
            { Metric: "Avg Weight", Calculation: "Total Live Weight (kg) / Total Birds Sold" },
            { Metric: "Feed Cost", Calculation: "Total Feed Bags × Feed Price Per Bag" },
            { Metric: "DOC Cost", Calculation: "Total DOC Placed × DOC Price Per Bird" },
            { Metric: "Profit", Calculation: "(Total Weight × Effective Rate) - (Feed Cost + DOC Cost)" }
        ]
    });
}

/**
 * Generates a PDF report for the sales ledger
 * Groups details by month/year with monthly sub-totals
 */
export async function exportSalesLedgerPDF(sales: any[], title: string) {
    let totalRevenue = 0; let totalBirds = 0; let totalWeight = 0; let totalProfit = 0;

    // Grouping to identify latest sale per cycle
    const cycleSalesMap: Record<string, string[]> = {};
    sales.forEach((s: any) => {
        const key = s.cycleId || s.historyId || "unknown";
        if (!cycleSalesMap[key]) cycleSalesMap[key] = [];
        cycleSalesMap[key].push(s.id);
    });

    sales.forEach((s: any) => {
        const revenue = s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0;
        totalRevenue += revenue;
        totalBirds += s.birdsSold || 0;
        totalWeight += Number(s.totalWeight) || 0;
        if (s.cycleContext?.isEnded && s.reports?.[0]?.id === s.selectedReportId) {
            totalProfit += s.cycleContext.profit || 0;
        }
    });

    // Sort and group by month
    const sortedSales = [...sales].sort((a, b) => new Date(a.saleDate || a.createdAt).getTime() - new Date(b.saleDate || b.createdAt).getTime());
    const monthGroups: Record<string, { label: string, sales: any[] }> = {};
    sortedSales.forEach(s => {
        const d = new Date(s.saleDate || s.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!monthGroups[key]) monthGroups[key] = { label: d.toLocaleString('default', { month: 'long', year: 'numeric' }), sales: [] };
        monthGroups[key].sales.push(s);
    });

    // Build a sale row helper
    const buildSaleRow = (s: any) => {
        const ctx = s.cycleContext;
        const isEnded = ctx?.isEnded;
        const isLatest = cycleSalesMap[s.cycleId || s.historyId || "unknown"]?.[0] === s.id;
        const showWeighted = isEnded && isLatest;

        const feedConsumed = s.feedConsumed || s.reports?.[0]?.feedConsumed;
        let feedTotal = 0;
        try {
            const parsed = typeof feedConsumed === 'string' ? JSON.parse(feedConsumed) : feedConsumed;
            if (Array.isArray(parsed)) feedTotal = parsed.reduce((sum: number, f: any) => sum + (Number(f.bags) || 0), 0);
        } catch (e) { }

        return `
            <tr>
                <td>${formatLocalDate(s.saleDate || s.createdAt)}</td>
                <td><b>${s.farmerName || s.cycle?.farmer?.name || s.history?.farmer?.name || "-"}</b></td>
                <td>${showWeighted ? `<b>${ctx.age}</b>` : (s.saleAge ?? ctx?.age ?? "N/A")} d</td>
                <td>${s.birdsSold}</td>
                <td>${Number(s.totalWeight).toFixed(2)}</td>
                <td>৳${(s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0).toLocaleString()}</td>
                <td><small>C: ৳${(s.cashReceived || 0).toLocaleString()}<br/>D: ৳${(s.depositReceived || 0).toLocaleString()}<br/>M: ৳${(s.medicineCost || 0).toLocaleString()}</small></td>
                <td>${feedTotal || "-"}</td>
                <td>${showWeighted ? `${ctx?.fcr || "-"} / ${ctx?.epi || "-"}` : "-"}</td>
                <td style="color: ${showWeighted ? ((ctx?.profit || 0) >= 0 ? '#10b981' : '#ef4444') : 'inherit'}">
                    ${showWeighted ? `৳${Math.round(ctx?.profit || 0).toLocaleString()}` : "-"}
                </td>
            </tr>
        `;
    };

    // Build month sections
    const monthSections = Object.values(monthGroups).map(group => {
        const monthRevenue = group.sales.reduce((sum, s) => sum + (s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0), 0);
        const monthBirds = group.sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
        return `
            <div class="section-title">${group.label} — ${group.sales.length} sales, ${monthBirds.toLocaleString()} birds, ৳${monthRevenue.toLocaleString()}</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th><th>Farmer</th><th>Age</th><th>Birds</th><th>Weight</th>
                        <th>Revenue</th><th>Cash/Dep/Med</th><th>Feed</th><th>FCR/EPI</th><th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${group.sales.map(s => buildSaleRow(s)).join('')}
                </tbody>
            </table>
        `;
    }).join('');

    const htmlContent = `
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-value">৳${(totalRevenue || 0).toLocaleString()}</div>
                <div class="kpi-label">Total Revenue</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${(totalBirds || 0).toLocaleString()}</div>
                <div class="kpi-label">Total Birds Sold</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${totalWeight.toFixed(2)} kg</div>
                <div class="kpi-label">Total Weight</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">৳${(totalProfit || 0).toLocaleString()}</div>
                <div class="kpi-label">Net Profit</div>
            </div>
        </div>
        ${monthSections}
    `;

    return await generatePDF({ title, htmlContent });
}
