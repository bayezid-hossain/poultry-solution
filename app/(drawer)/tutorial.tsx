import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Bell,
    BookOpen,
    BrainCircuit,
    Check,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Download,
    GraduationCap,
    Home,
    Info,
    Lightbulb,
    Package,
    Settings,
    ShoppingBag,
    Sparkles,
    UserCog,
    Users,
    Wheat
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

// ─── Types ───────────────────────────────────────────────
interface Step {
    title: string;
    description: string;
}

interface TipItem {
    text: string;
    type: "tip" | "info" | "warning";
}

interface TutorialSection {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    bgColor: string;
    steps: Step[];
    tips?: TipItem[];
}

// ─── Tutorial Data ───────────────────────────────────────
const TUTORIAL_SECTIONS: TutorialSection[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        subtitle: "Set up your account and navigate the app",
        icon: GraduationCap,
        color: "text-emerald-600",
        bgColor: "bg-emerald-500/10",
        steps: [
            {
                title: "Sign In & Account Recovery",
                description:
                    "Create an account or sign in with your credentials. If you forget your password, use the reset flow, and verify your email securely with a temporary code.",
            },
            {
                title: "Join an Organization",
                description:
                    'After signing in, you must belong to an organization. You can request to join one and wait on the "Pending Approval" screen until a manager lets you in.',
            },
            {
                title: "Navigate with the Drawer",
                description:
                    "Swipe right from the left edge or tap the ☰ menu icon to open the navigation drawer. From here you can access Dashboard, Cycles, Farmers, Sales, Orders, Reports, and Settings.",
            },
            {
                title: "Switch Modes",
                description:
                    'If you are an Owner or Manager, go to Settings and switch between "Officer" and "Management" modes. The drawer navigation updates to show mode-specific features.',
            },
            {
                title: "Update Your Profile",
                description:
                    'In Settings, tap "Edit Profile" to update your display name, branch name, and mobile number. These details appear in reports and are visible to managers.',
            },
            {
                title: "Push Notifications",
                description:
                    "The app registers for push notifications automatically. You will receive alerts for important events like membership approvals, stock warnings, and more.",
            },
        ],
        tips: [
            {
                text: "Swipe right from the left edge on any screen to quickly open the drawer menu.",
                type: "tip",
            },
        ],
    },
    {
        id: "dashboard",
        title: "Dashboard",
        subtitle: "Your overview of daily operations and KPIs",
        icon: Home,
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
        steps: [
            {
                title: "KPI Cards",
                description:
                    "At the top you'll see key performance indicators: total farmers under you, active cycles running, and today's feed consumption. These update in real-time.",
            },
            {
                title: "Smart Watchdog Alarms",
                description:
                    "The Smart Watchdog widget automatically scans your active cycles for abnormal mortality spikes (>1% critical, >0.5% warning) and actively alerts you.",
            },
            {
                title: "Operations Tab",
                description:
                    "The main area shows all your active cycles with their current day, remaining birds, and today's feed intake. Tap on any cycle card to go directly to its detail page.",
            },
            {
                title: "Performance Insights",
                description:
                    "Scroll down to see performance comparisons across your cycles — best FCR, highest survival rate, and top-performing batches.",
            },
            {
                title: "Quick Details",
                description:
                    "The Quick Details section shows a snapshot of your farmer assignments and recent activity for quick reference.",
            },
        ],
    },
    {
        id: "farmers",
        title: "Farmers",
        subtitle: "Manage your farmer assignments and stock",
        icon: Wheat,
        color: "text-amber-600",
        bgColor: "bg-amber-500/10",
        steps: [
            {
                title: "Add a Farmer",
                description:
                    'Tap the "+" button to register a new farmer. You must provide their name and initial main stock (feed bags). Optionally add their location and mobile number.',
            },
            {
                title: "View Farmer Profile",
                description:
                    "Your farmer list shows each farmer's active status. Tap a farmer to view their dedicated detail page, showing their full history, open cycles, and lifetime stats.",
            },
            {
                title: "Start Cycle Direct",
                description:
                    "From a farmer's detail page, use the 'Start Cycle' action to immediately launch a new bird batch dedicated to that farmer without navigating away.",
            },
            {
                title: "Edit Farmer Details",
                description:
                    "Tap on a farmer's card to see more options. You can edit their name, location, and mobile number at any time.",
            },
            {
                title: "Manage & Correct Main Stock",
                description:
                    'Use the stock icon to safely add (max 2,000 bags) or deduct (max 1,000 bags) feed. If logs are incorrect, you can edit existing stock logs, correct stock mismatches directly, or revert a stock transfer.',
            },
            {
                title: "Cascade Updates",
                description:
                    "If you edit a farmer's Name or Location, the system automatically cascades this update to all their active cycles, archived cycle history, and past sale events to keep records consistent.",
            },
            {
                title: "Security Money",
                description:
                    "Track security deposits for each farmer. Changes are logged with the previous and new amounts for full audit trail.",
            },
            {
                title: "Security Money History",
                description:
                    "View the full history of security money changes for a farmer — every increase, decrease, and the officer who made the change, with timestamps.",
            },
            {
                title: "Problematic Feed",
                description:
                    'Mark feed bags as "problematic" (damaged, expired, etc.). This is tracked separately and shown in reports.',
            },
            {
                title: "Delete / Soft-Delete",
                description:
                    'Deleting a farmer soft-deletes them (status changes to "deleted"). To prevent naming conflicts in the future, the system automatically appends a short ID to their name (e.g., "JOHN_A1B2"), instantly freeing up their original name for reuse.',
            },
            {
                title: "Restore Deleted Farmer",
                description:
                    'Accidentally deleted a farmer? Open the "Archived" tab to find soft-deleted farmers and restore them back to active status with all their history intact.',
            },
            {
                title: "Benchmark Stats",
                description:
                    "Pro users can view benchmark statistics for a farmer — average FCR, EPI, survival rate, and average weight across all their past cycles.",
            },
        ],
        tips: [
            {
                text: "Farmer names must be unique per officer within the same organization.",
                type: "info",
            },
            {
                text: "You can only manage farmers that you created. Other officers' farmers are not visible in Officer mode.",
                type: "warning",
            },
        ],
    },
    {
        id: "cycles",
        title: "Cycles",
        subtitle: "Track active bird batches from start to finish",
        icon: Users,
        color: "text-violet-600",
        bgColor: "bg-violet-500/10",
        steps: [
            {
                title: "Create a Cycle",
                description:
                    'Tap "Add Cycle" and select a farmer. Enter the batch name, Day Old Chicks (DOC) count (max 50,000 birds), and optionally the bird type. As a safety limit, new and backdated cycles cannot be older than 40 days.',
            },
            {
                title: "Cycle Detail Navigation",
                description:
                    "Tap any cycle to open its Detail Page, which contains dedicated tabs for Logs, Sales, and Performance Analysis all in one organized view.",
            },
            {
                title: "Daily Feed Logging",
                description:
                    "Each day, log the feed consumed for each cycle. Tap the feed icon on the cycle card, enter the number of bags (max 500 bags/entry), and confirm. This increments the cycle's total intake and decrements the farmer's main stock.",
            },
            {
                title: "Mortality Tracking",
                description:
                    "Record daily bird deaths by tapping the mortality icon. Enter the count (max 2,000 birds/entry) and an optional note. The system automatically updates the remaining bird count.",
            },
            {
                title: "Age Tracking",
                description:
                    "The cycle's age (in days) can be manually updated. This is used in performance metric calculations like FCR and EPI.",
            },
            {
                title: "Corrections",
                description:
                    'Made a mistake? Use the "Correction" feature to adjust feed intake or mortality figures. Corrections are logged separately for transparency.',
            },
            {
                title: "Correct DOC / Age / Mortality",
                description:
                    "Pro users can correct the initial DOC count, bird age, or total mortality on active cycles. Each correction creates a log entry with old and new values for audit purposes.",
            },
            {
                title: "Revert a Log Entry",
                description:
                    'Made a feed or mortality entry by mistake? Use "Revert" on any log entry to undo it. Note: You cannot revert or edit mortality logs if a sale occurred after that date—those numbers are locked.',
            },
            {
                title: "Backdate a Cycle",
                description:
                    "Need to register a cycle that started earlier? Pro users can backdate an active cycle's creation date (max 40 days) or a finished cycle in history (max 2 years / 730 days). This adjusts the age calculation retroactively.",
            },
            {
                title: "Restore / Reopen a Cycle",
                description:
                    'Closed a cycle too early? Use "Restore". Read carefully: This pulls the cycle back to Active, restores final feed intake back to the farmer\'s main stock, and DELETES ALL previous sale events and reports for this cycle to prevent double-counting.',
            },
            {
                title: "Bulk Create Cycles",
                description:
                    "Pro users can create multiple cycles at once from the AI-parsed DOC order data. Each cycle is auto-linked to the matched farmer.",
            },
            {
                title: "Delete Cycle / Delete History",
                description:
                    "If a cycle was created by mistake, you can completely 'Delete' it (restoring consumed stock). For finished cycles, you can 'Delete History' to remove the record permanently.",
            },
            {
                title: "Edit Age (During Sale)",
                description:
                    "When recording a sale, you can edit the cycle's age directly from the sale modal if it's not accurate. This ensures FCR, EPI and other metrics are calculated correctly.",
            },
            {
                title: "FCR & EPI Details",
                description:
                    "Tap FCR or EPI for a breakdown. FCR (Feed Conversion Ratio) is Total Feed (kg) / Total Live Weight (kg); lower is better. EPI (European Production Index) is (Survival % × AVG Weight / FCR / Age) × 100; higher means better flock performance.",
            },
            {
                title: "AI Analysis Panel",
                description:
                    "On the cycle detail page, view the AI Analysis tab to get intelligent, real-time insights and recommendations based on the current performance and mortality trajectory.",
            },
            {
                title: "Profit Details",
                description:
                    "Tap the profit figure to see the exact calculation: Total Revenue minus the complete cost (DOC Cost + Feed Cost + Medicine/Vaccine costs + Transport/Labor costs) to find your net profit per bird.",
            },
            {
                title: "View Cycle Logs",
                description:
                    "Tap on a cycle to see its complete log history — every feed entry, mortality record, and correction, with timestamps and who made each entry.",
            },
            {
                title: "Close / Archive a Cycle",
                description:
                    'When a batch is complete, close the cycle. It moves to "Cycle History" with a snapshot of all final stats (DOC, mortality, intake, age). Logs are preserved.',
            },
        ],
        tips: [
            {
                text: "Feed logging automatically updates the farmer's main stock — you don't need to manually deduct it.",
                type: "tip",
            },
            {
                text: "Each farmer can have multiple active cycles running simultaneously.",
                type: "info",
            },
            {
                text: "Corrections (DOC, Age, Mortality) and Backdate are Pro features. Revert and basic editing are free.",
                type: "info",
            },
        ],
    },
    {
        id: "sales",
        title: "Sales",
        subtitle: "Record bird sales and generate financial reports",
        icon: ShoppingBag,
        color: "text-pink-600",
        bgColor: "bg-pink-500/10",
        steps: [
            {
                title: "Record a Sale & Track Dues",
                description:
                    'From a cycle\'s detail page, tap "Record Sale". Enter the birds sold (max 50,000), total weight (max 100,000 kg), price per kg, and payment details (cash received, deposits). The system automatically tracks any remaining unpaid balance as "Due".',
            },
            {
                title: "Feed Consumed & Stock",
                description:
                    "During a sale, you also record the feed consumed and current feed stock broken down by feed type (e.g., B1, B2).",
            },
            {
                title: "Generate Sale Reports",
                description:
                    "After recording a sale event, you can generate detailed financial reports that include FCR, EPI, survival rate, DOC cost, feed cost, revenue, and net profit.",
            },
            {
                title: "Adjust Sale Event",
                description:
                    "You can adjust details (birds sold, weight, price, feed) without recreating the sale. Note: If your adjustment lowers the total dead/sold count so that live birds remain, the system will automatically reopen the cycle to 'Active'.",
            },
            {
                title: "Adjust Reports",
                description:
                    "Create additional reports for the same sale event with different pricing or quantities. Select the most accurate report as the primary.",
            },
            {
                title: "Preview Sale",
                description:
                    'Use "Preview Sale" to see estimated metrics (FCR, EPI, profit) based on current cycle data and proposed sale details before finalizing.',
            },
            {
                title: "Set Active Report Version",
                description:
                    'Mark the most accurate report as "Active". The active report determines your "Effective Rate" — calculations look at all past active sales across the cycle to average out surplus/deficits and establish true profitability.',
            },
            {
                title: "View Sales History",
                description:
                    "The Sales page shows all recent sales grouped by farmer with birds sold, total weight, average weight, and total amount.",
            },
            {
                title: "Delete a Sale Event",
                description:
                    "Delete an erroneous sale event and its reports. Because this reduces the number of birds sold, the system will instantly reopen the closed cycle back to the 'Active' state if live birds now remain.",
            },
        ],
        tips: [
            {
                text: "Sales is a Pro feature. Upgrade to access detailed financial reporting and sale management.",
                type: "info",
            },
        ],
    },
    {
        id: "stock-ledger",
        title: "Stock Ledger & Import History",
        subtitle: "Full audit trail of all feed stock changes",
        icon: ClipboardList,
        color: "text-cyan-600",
        bgColor: "bg-cyan-500/10",
        steps: [
            {
                title: "View All Stock Logs",
                description:
                    "The Stock Ledger shows every stock change across all your farmers — restocks, cycle feed consumption, corrections, and initial stock entries with type, amount, and timestamp.",
            },
            {
                title: "Search & Filter",
                description:
                    "Search by farmer name or use the search bar to quickly find specific stock movements.",
            },
            {
                title: "Import History",
                description:
                    "Bulk imports appear here with the driver name and reference details for full traceability.",
            },
            {
                title: "Revert a Stock Transaction",
                description:
                    'Made a restock error? Use the revert button to undo it. Note: You cannot revert a transaction if doing so would result in a negative stock balance for the farmer. Restocks are capped at 2,000 bags/entry to prevent typos.',
            },
            {
                title: "Transfer & Revert Transfer",
                description:
                    "Transfer feed bags from one farmer to another without affecting the total organizational stock. Reverting a transfer safely reverses BOTH sides of the transaction simultaneously.",
            },
            {
                title: "Bulk Feed Import",
                description:
                    "Pro users can add stock to multiple farmers in one step (up to 50 farmers per batch) using the AI Smart Feed Import. Paste a text list of farmer names and bag counts — applied in one transaction with a driver name tag.",
            },
            {
                title: "Batch Details",
                description:
                    "View all individual stock entries within a specific bulk import batch. Each entry shows the farmer, amount, and notes.",
            },
            {
                title: "All Farmers Stock Overview",
                description:
                    "Pro users can view a consolidated stock overview for ALL active farmers — main stock, consumed, and available balance for each.",
            },
        ],
        tips: [
            {
                text: "Bulk Import and All Farmers Stock overview are Pro features.",
                type: "info",
            },
        ],
    },
    {
        id: "orders",
        title: "Orders",
        subtitle: "Create and manage feed, DOC, and sale orders",
        icon: Package,
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        steps: [
            {
                title: "Feed Orders",
                description:
                    "From the Orders tab, create feed orders by selecting a delivery date, adding farmers and their required feed types (B1, B2, etc.) with quantities. Share as a formatted message.",
            },
            {
                title: "DOC Orders & Confirmation",
                description:
                    "Plan Day Old Chick orders (bird type, count, contract). Orders cannot be backdated past 40 days. When a DOC order is confirmed, the system automatically creates a brand new 'Active Cycle' for that farmer, named after them.",
            },
            {
                title: "Sale Orders",
                description:
                    "Plan upcoming bird sales. Enter total weight, DOC count, average weight range, and bird age per farmer for the planned sale date.",
            },
            {
                title: "Confirm & Manage Orders",
                description:
                    'Orders start as "PENDING". Once confirmed via the confirmation modals, mark them as "CONFIRMED". You can also securely delete orders that are no longer needed.',
            },
            {
                title: "Share Orders",
                description:
                    "Each order can be shared as a formatted text message — perfect for sending to suppliers, drivers, or managers via WhatsApp or SMS.",
            },
            {
                title: "Branch Name Auto-fill",
                description:
                    "When creating or sharing any order, your Branch Name is automatically filled in based on your profile to save you time.",
            },
        ],
        tips: [
            {
                text: "All order types are Pro features. Upgrade to unlock order management.",
                type: "info",
            },
        ],
    },
    {
        id: "ai-features",
        title: "AI-Powered Features",
        subtitle: "Smart automation for feed imports, orders, and risk alerts",
        icon: BrainCircuit,
        color: "text-indigo-600",
        bgColor: "bg-indigo-500/10",
        steps: [
            {
                title: "Smart Feed Import",
                description:
                    "Paste a text message (e.g., from WhatsApp) containing farmer names and feed bag counts. The AI automatically extracts and matches farmer names to your existing list, even with spelling variations.",
            },
            {
                title: "Smart DOC Order Parsing",
                description:
                    "Paste a raw DOC order text and the AI will extract each farmer's name, bird count, bird type, and order date. Matched farmers are auto-linked.",
            },
            {
                title: "Smart Watchdog",
                description:
                    'The risk assessment tool scans all active cycles for abnormal mortality spikes in the last 3 days. It flags "CRITICAL" (>1%) and "WARNING" (>0.5%) conditions with farmer-specific alerts.',
            },
            {
                title: "Supply Chain Prediction",
                description:
                    "Predicts upcoming feed stockouts by calculating each farmer's daily burn rate. Farmers with <3 bags remaining or <4 days of supply are flagged as CRITICAL or HIGH urgency.",
            },
        ],
        tips: [
            {
                text: "AI features are Pro-only. Smart Watchdog and Supply Chain tools are available from the Dashboard.",
                type: "info",
            },
            {
                text: "The AI uses multiple fallback models — if one is unavailable, it automatically tries the next.",
                type: "tip",
            },
        ],
    },
    {
        id: "notifications",
        title: "Notifications",
        subtitle: "Stay informed with in-app and push alerts",
        icon: Bell,
        color: "text-orange-600",
        bgColor: "bg-orange-500/10",
        steps: [
            {
                title: "View Notifications",
                description:
                    "Tap the bell icon in the header bar (visible for Managers/Owners). Notifications include membership approvals, stock alerts, cycle events, and system announcements.",
            },
            {
                title: "Unread Count Badge",
                description:
                    "A green dot appears on the bell icon when you have unread notifications. The count refreshes automatically every 30 seconds.",
            },
            {
                title: "Mark as Read",
                description:
                    'Tap a notification to mark it as read, or use "Mark All as Read" to clear all unread notifications at once.',
            },
            {
                title: "Delete Notifications",
                description:
                    "Swipe or tap the delete button on individual notifications to remove them permanently.",
            },
        ],
    },
    {
        id: "reports-downloads",
        title: "Reports & Downloads",
        subtitle: "Generate, view, share, and save reports in PDF or Excel",
        icon: Download,
        color: "text-fuchsia-600",
        bgColor: "bg-fuchsia-500/10",
        steps: [
            {
                title: "Available Reports",
                description:
                    "You can generate 7 types of reports: Active Stock, Sales Ledger, DOC Placements, Yearly Performance, Monthly Production, All Farmer Stock, and Problematic Feeds.",
            },
            {
                title: "Export Formats",
                description:
                    "Every report is available in both PDF and Excel format. PDFs include styled headers and calculations pages. Excel files include summary rows, grouped sections, and color-coded cells.",
            },
            {
                title: "View a Report",
                description:
                    'After generating a report, a dialog appears with 3 options: "View" opens the file directly in your device\'s default PDF/Excel viewer.',
            },
            {
                title: "Share a Report",
                description:
                    '"Share" opens the system share sheet, letting you send the report via WhatsApp, email, Bluetooth, or any other sharing method on your device.',
            },
            {
                title: "Save / Download a Report",
                description:
                    '"Save" downloads the file to your configured download folder (see Settings). Reports are organized in date-based subfolders (Year → Month → Day) for easy finding.',
            },
            {
                title: "Auto-filled Branch & Officer Info",
                description:
                    "Report headers automatically include your specific Officer Name and Branch Name context on every generated PDF or Excel file.",
            },
            {
                title: "Download All Reports",
                description:
                    'Use the "Download All Reports" button to generate and save ALL report types at once. A circular progress indicator shows progress. You can stop the process mid-way — it will revert any already-saved files.',
            },
            {
                title: "Report Date Ranges",
                description:
                    "DOC Placements and Production reports support date range filters. Select a start and end date to see data for a specific period.",
            },
            {
                title: "Officer Name in Reports",
                description:
                    "In Management mode, the selected officer's name is automatically added to report headers for context and identification.",
            },
        ],
        tips: [
            {
                text: "All reports are Pro features. Keep your daily logs accurate for the best report results.",
                type: "tip",
            },
            {
                text: "Set your download folder in Settings first! Without it, you'll be prompted to choose a location every time on Android.",
                type: "warning",
            },
        ],
    },
    {
        id: "settings-app",
        title: "Settings & App Management",
        subtitle: "Download folder, theme, updates, and more",
        icon: Settings,
        color: "text-gray-600",
        bgColor: "bg-gray-500/10",
        steps: [
            {
                title: "Set Download Folder (Android)",
                description:
                    'Go to Settings → "Storage & Downloads" → tap "Set Folder". Choose a folder on your device where all generated reports will be saved automatically. This eliminates the folder-picker popup on every download.',
            },
            {
                title: "Reset Download Folder",
                description:
                    'If you want to change your download location, tap "Reset" in the Storage & Downloads section, then set a new folder.',
            },
            {
                title: "Theme / Appearance",
                description:
                    "Switch between Light, Dark, or System (auto) mode from the Appearance section in Settings. Your preference is saved automatically and persists across app restarts.",
            },
            {
                title: "Check for Updates",
                description:
                    'Tap "Check" in the App Update section to manually check for new versions. If an update is found, you\'ll see the version number, changelog (release notes), and a "Download" button.',
            },
            {
                title: "Automatic Update Checks",
                description:
                    "The app also checks for updates automatically on launch. If a new version is available, a banner appears with the latest version info and a one-tap download button.",
            },
            {
                title: "Download & Install Updates",
                description:
                    'When an update is available, tap "Download" to download the APK directly. Once downloaded, the installer opens automatically. After installing, restart the app.',
            },
            {
                title: "Request Pro Access",
                description:
                    'Need Pro features? Tap the "Upgrade" or "Request Access" button in the subscription area. Your request goes to the admin for approval.',
            },
            {
                title: "View Organization Details",
                description:
                    "Settings shows your current organization name and your role (OWNER, MANAGER, MEMBER). This helps confirm you're in the right workspace.",
            },
            {
                title: "Sign Out",
                description:
                    'Tap the red "Sign Out" button at the bottom of Settings to log out. All local data is cleared and you\'re returned to the sign-in screen.',
            },
        ],
        tips: [
            {
                text: "Pro features include Sales, all Order types, Stock & Import, Reports, and AI tools.",
                type: "info",
            },
            {
                text: "Always keep the app updated for the latest features and bug fixes.",
                type: "tip",
            },
        ],
    },
    {
        id: "management",
        title: "Management Mode",
        subtitle: "Owner/Manager tools for cross-officer oversight",
        icon: UserCog,
        color: "text-slate-600",
        bgColor: "bg-slate-500/10",
        steps: [
            {
                title: "Switch to Management Mode",
                description:
                    "Go to Settings and switch to \"Management\" mode. The drawer navigation changes to show management-specific features.",
            },
            {
                title: "Management Dashboard",
                description:
                    "The dashboard upgrades to show organization-wide Management Stats cards and a structural Production Tree visualization.",
            },
            {
                title: "Officers Overview",
                description:
                    "View all officers in your organization, their status (active/pending), and role. Approve or reject pending membership requests.",
            },
            {
                title: "Members Management",
                description:
                    "View and manage all organization members. Change roles, approve/reject requests, and track membership status. Note: New managers start with 'VIEW' access by default until upgraded to 'EDIT' by an Owner.",
            },
            {
                title: "Cross-Officer Farmers & Cycles",
                description:
                    "In management mode, you can see ALL farmers and cycles across all officers — not just your own.",
            },
            {
                title: "Officer Filtering & Details",
                description:
                    "Use the Officer Selector tool on list pages to quickly filter data by specific personnel, and tap into Officer profiles to review their overall performance.",
            },
            {
                title: "Feed Orders (Management)",
                description:
                    "View feed orders from all officers. Coordinate deliveries and track order statuses across the team.",
            },
            {
                title: "Management Reports",
                description:
                    "Access Sales & Stock reports, Performance analytics, DOC Placements, and Monthly Production across all officers for organization-wide insights.",
            },
        ],
        tips: [
            {
                text: "Management features are only available to users with Owner or Manager roles.",
                type: "info",
            },
            {
                text: 'Managers with "VIEW" access can see everything but can\'t edit. "EDIT" access allows full management capabilities.',
                type: "warning",
            },
        ],
    },
];

const STORAGE_KEY = "poultry-tutorial-progress";

// ─── Color helpers ───────────────────────────────────────
const tipColors = {
    tip: {
        bg: "bg-emerald-500/5",
        text: "text-emerald-700",
        border: "border-emerald-500/15",
        icon: Lightbulb,
    },
    info: {
        bg: "bg-blue-500/5",
        text: "text-blue-700",
        border: "border-blue-500/15",
        icon: Sparkles,
    },
    warning: {
        bg: "bg-amber-500/5",
        text: "text-amber-700",
        border: "border-amber-500/15",
        icon: Info,
    },
};

// ─── Component ───────────────────────────────────────────
export default function TutorialScreen() {
    const [completedSections, setCompletedSections] = useState<string[]>([]);
    const [expandedSection, setExpandedSection] = useState<string | null>("getting-started");

    // Load progress
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            if (saved) {
                try { setCompletedSections(JSON.parse(saved)); } catch { }
            }
        });
    }, []);

    // Save progress
    const saveProgress = useCallback((sections: string[]) => {
        setCompletedSections(sections);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sections)).catch(() => { });
    }, []);

    const toggleSection = (id: string) => {
        setExpandedSection((prev) => (prev === id ? null : id));
    };

    const toggleCompleted = (id: string) => {
        const next = completedSections.includes(id)
            ? completedSections.filter((s) => s !== id)
            : [...completedSections, id];
        saveProgress(next);
    };

    const progress = Math.round(
        (completedSections.length / TUTORIAL_SECTIONS.length) * 100
    );

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Tutorial" />

            <ScrollView contentContainerClassName="p-4 pb-24 gap-4">
                {/* Hero */}
                <View className="rounded-3xl bg-primary/5 border border-primary/10 p-6">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center">
                            <Icon as={BookOpen} size={24} className="text-primary" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-black text-foreground tracking-tight">
                                App Tutorial
                            </Text>
                            <Text className="text-xs text-muted-foreground font-medium">
                                Learn every feature step by step
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Progress
                        </Text>
                        <Text className="text-[10px] font-black text-primary">
                            {completedSections.length}/{TUTORIAL_SECTIONS.length} sections
                        </Text>
                    </View>
                    <View className="h-2 bg-muted rounded-full overflow-hidden">
                        <View
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </View>
                </View>

                {/* Sections */}
                {TUTORIAL_SECTIONS.map((section) => {
                    const isExpanded = expandedSection === section.id;
                    const isCompleted = completedSections.includes(section.id);

                    return (
                        <View
                            key={section.id}
                            className={`rounded-2xl border overflow-hidden ${isExpanded
                                ? "border-border"
                                : "border-border/40"
                                } ${isCompleted ? "bg-muted/20" : "bg-card"}`}
                        >
                            {/* Section Header */}
                            <Pressable
                                onPress={() => toggleSection(section.id)}
                                className="flex-row items-center gap-3 p-4 active:bg-accent/30"
                            >
                                <View
                                    className={`shrink-0 h-10 w-10 rounded-xl ${section.bgColor} items-center justify-center`}
                                >
                                    {isCompleted ? (
                                        <Icon as={Check} size={20} className={section.color} />
                                    ) : (
                                        <Icon as={section.icon} size={20} className={section.color} />
                                    )}
                                </View>

                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                                            {section.title}
                                        </Text>
                                        {isCompleted && (
                                            <View className="bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                <Text className="text-[8px] font-black text-emerald-600">DONE</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                                        {section.subtitle}
                                    </Text>
                                </View>

                                <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
                                    <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
                                </View>
                            </Pressable>

                            {/* Section Content */}
                            {isExpanded && (
                                <View className="px-4 pb-4 gap-3">
                                    <Separator className="opacity-20" />

                                    {/* Steps */}
                                    {section.steps.map((step, stepIndex) => (
                                        <View key={stepIndex} className="flex-row gap-3">
                                            <View className="mt-0.5">
                                                <View
                                                    className={`h-6 w-6 rounded-full ${section.bgColor} items-center justify-center`}
                                                >
                                                    <Text className={`text-[10px] font-black ${section.color}`}>
                                                        {stepIndex + 1}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="flex-1 pb-2">
                                                <Text className="text-[13px] font-bold text-foreground mb-1">
                                                    {step.title}
                                                </Text>
                                                <Text className="text-[11px] text-muted-foreground leading-[16px]">
                                                    {step.description}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    {/* Tips */}
                                    {section.tips && section.tips.length > 0 && (
                                        <View className="gap-2 mt-1">
                                            {section.tips.map((tip, tipIndex) => {
                                                const colors = tipColors[tip.type];
                                                return (
                                                    <View
                                                        key={tipIndex}
                                                        className={`flex-row items-start gap-2 p-3 rounded-xl ${colors.bg} border ${colors.border}`}
                                                    >
                                                        <Icon as={colors.icon} size={14} className={`${colors.text} mt-0.5`} />
                                                        <Text className={`text-[11px] ${colors.text} flex-1 leading-[16px] font-medium`}>
                                                            {tip.text}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Footer Action */}
                                    <Pressable
                                        onPress={() => toggleCompleted(section.id)}
                                        className={`flex-row items-center justify-center gap-2 py-3 rounded-xl mt-1 ${isCompleted
                                            ? "bg-emerald-500/10 border border-emerald-500/20"
                                            : "bg-primary/10 border border-primary/20"
                                            } active:opacity-70`}
                                    >
                                        <Icon
                                            as={isCompleted ? CheckCircle2 : Check}
                                            size={16}
                                            className={isCompleted ? "text-emerald-600" : "text-primary"}
                                        />
                                        <Text className={`text-xs font-bold uppercase tracking-wider ${isCompleted ? "text-emerald-600" : "text-primary"
                                            }`}>
                                            {isCompleted ? "Completed ✓" : "Mark as Read"}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Completion Message */}
                {progress === 100 && (
                    <View className="items-center py-8 gap-3">
                        <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center">
                            <Icon as={GraduationCap} size={32} className="text-emerald-600" />
                        </View>
                        <Text className="text-lg font-black text-foreground">
                            🎉 Tutorial Complete!
                        </Text>
                        <Text className="text-xs text-muted-foreground text-center max-w-[280px]">
                            You've reviewed all sections. You're now ready to make the most of Poultry Solution!
                        </Text>
                        <Pressable
                            onPress={() => saveProgress([])}
                            className="mt-2 px-6 py-2.5 rounded-xl border border-border active:bg-accent/50"
                        >
                            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Reset Progress
                            </Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
