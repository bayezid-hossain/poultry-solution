import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

interface DateFieldProps {
    label?: string;
    placeholder?: string;
    value: string; // yyyy-MM-dd, or "" when empty
    onChange: (value: string) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    clearable?: boolean;
}

export function DateField({ label, placeholder = "Select date", value, onChange, minimumDate, maximumDate, clearable }: DateFieldProps) {
    const [open, setOpen] = useState(false);
    const current = value ? parseISO(value) : new Date();

    return (
        <View className="flex-1">
            {label ? <Text className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</Text> : null}
            <View className="flex-row items-center h-11 rounded-xl border border-border bg-card px-3 active:bg-muted/50">
                <Pressable className="flex-1 flex-row items-center gap-2 h-full" onPress={() => setOpen(true)}>
                    <Icon as={CalendarDays} size={16} className="text-muted-foreground" />
                    <Text className={value ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}>
                        {value ? format(current, "dd/MM/yyyy") : placeholder}
                    </Text>
                </Pressable>
                {clearable && value ? (
                    <Pressable hitSlop={8} onPress={() => onChange("")}>
                        <Icon as={X} size={16} className="text-muted-foreground" />
                    </Pressable>
                ) : null}
            </View>

            {open && (
                <View>
                    <DateTimePicker
                        value={current}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                        onChange={(event, picked) => {
                            if (Platform.OS !== "ios") setOpen(false);
                            if (event.type === "set" && picked) onChange(format(picked, "yyyy-MM-dd"));
                        }}
                    />
                    {Platform.OS === "ios" && (
                        <Pressable className="self-end px-4 py-2 active:opacity-70" onPress={() => setOpen(false)}>
                            <Text className="text-sm font-bold text-primary">Done</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}
