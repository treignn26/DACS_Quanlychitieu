// src/components/CalendarModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared calendar picker used by both index.tsx and add-transaction.tsx.
// Props:
//   visible        – controls Modal visibility
//   selectedDate   – currently highlighted date (null = none)
//   onSelectDate   – called with the tapped Date; caller decides what to do
//   onClose        – called when the modal should close
//   txDates?       – array of dates that get a green dot indicator
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";

// ─── Design tokens (local copy — no shared token file per project rules) ─────
const COLORS = {
  cardBg: "#FFFFFF",
  heroBg: "#1A2E2A",
  accent: "#2ECC9A",
  accentSoft: "#E6FAF4",
  textPrimary: "#1A2422",
  textMuted: "#9EB8B0",
  textOnDark: "#FFFFFF",
  border: "#E8EFED",
};

// ─── Sizing ──────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.min(SCREEN_W - 48, 360);
const CELL_SIZE = Math.floor((CARD_W - 40) / 7); // 7 equal columns inside 20px padding each side

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─── Types ───────────────────────────────────────────────────────────────────
interface CalendarModalProps {
  visible: boolean;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  txDates?: Date[];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  txDates = [],
}: CalendarModalProps) {
  const { t, lang } = useLanguage();
  const today = new Date();

  // ── Internal view state: which month/year the calendar is showing ──────────
  const [viewYear, setViewYear] = useState(
    selectedDate?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    selectedDate?.getMonth() ?? today.getMonth(),
  );

  // Sync the visible month whenever selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // ── Month navigation ───────────────────────────────────────────────────────
  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // ── Build the grid cells (Monday-first, offset via (getDay()+6)%7) ─────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks so the grid always has complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  // ── Day press ─────────────────────────────────────────────────────────────
  const handleDayPress = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day, 0, 0, 0, 0);
    onSelectDate(picked);
    onClose();
  };

  // ── Localised close-button label (key not in AppStrings yet, use lang) ─────
  const closeLabel = lang === "vi" ? "✕ Đóng lịch" : "✕ Close calendar";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Semi-transparent backdrop — tap outside to dismiss */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        {/*
          Inner TouchableOpacity absorbs taps so they don't bubble up to the
          backdrop and accidentally close the modal while interacting with it.
        */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            /* absorb */
          }}
        >
          <View style={s.card}>
            {/* ── Month / year header with prev / next arrows ── */}
            <View style={s.header}>
              <TouchableOpacity
                style={s.navBtn}
                onPress={goToPrev}
                activeOpacity={0.75}
              >
                <Text style={s.navArrow}>‹</Text>
              </TouchableOpacity>

              <Text style={s.monthTitle}>
                {t.homeMonths[viewMonth]}
                {"  "}
                {viewYear}
              </Text>

              <TouchableOpacity
                style={s.navBtn}
                onPress={goToNext}
                activeOpacity={0.75}
              >
                <Text style={s.navArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ── Weekday column headers ── */}
            <View style={s.weekdayRow}>
              {t.homeWeekdays.map((wd: string, i: number) => (
                <View key={i} style={[s.cell, { height: 28 }]}>
                  <Text style={s.wdLabel}>{wd}</Text>
                </View>
              ))}
            </View>

            {/* ── Day grid ── */}
            <View style={s.grid}>
              {cells.map((day, idx) => {
                // Empty leading/trailing slots
                if (day === null) {
                  return (
                    <View
                      key={`blank-${idx}`}
                      style={[s.cell, { height: CELL_SIZE }]}
                    />
                  );
                }

                const cellDate = new Date(viewYear, viewMonth, day);
                const isToday = isSameDay(cellDate, today);
                const isSelected = selectedDate
                  ? isSameDay(cellDate, selectedDate)
                  : false;
                const hasTx = txDates.some((d) => isSameDay(d, cellDate));

                return (
                  <TouchableOpacity
                    key={`day-${idx}`}
                    style={[
                      s.cell,
                      { height: CELL_SIZE },
                      isSelected && s.cellSelected,
                      !isSelected && isToday && s.cellToday,
                    ]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.dayNum,
                        isSelected && s.dayNumSelected,
                        !isSelected && isToday && s.dayNumToday,
                      ]}
                    >
                      {day}
                    </Text>

                    {/* Transaction indicator dot */}
                    {hasTx && (
                      <View style={[s.dot, isSelected && s.dotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Close button — full width, always reachable ── */}
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={s.closeBtnTxt}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,22,18,0.60)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Card
  card: {
    width: CARD_W,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 16,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    // Elevation (Android)
    elevation: 14,
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    color: COLORS.heroBg,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // ── Weekday headers
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },

  // ── Day grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // ── Single cell (shared by weekday labels and day numbers)
  cell: {
    width: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  // Weekday label text (Mon, Tue… / T2, T3…)
  wdLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  // Day number text — default
  dayNum: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },

  // ── State variants: selected
  cellSelected: {
    backgroundColor: COLORS.heroBg,
    borderRadius: CELL_SIZE / 2,
  },
  dayNumSelected: {
    color: COLORS.textOnDark,
    fontWeight: "700",
  },

  // ── State variants: today (ring border, no fill)
  cellToday: {
    borderRadius: CELL_SIZE / 2,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  dayNumToday: {
    color: COLORS.heroBg,
    fontWeight: "700",
  },

  // ── Transaction dot
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 2,
  },
  dotSelected: {
    // Subtle white dot when selected so it's visible on dark bg
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  // ── Close button
  closeBtn: {
    marginTop: 16,
    backgroundColor: COLORS.heroBg,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  closeBtnTxt: {
    color: COLORS.textOnDark,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
