"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "@/lib/useLocalStorage";

export function useTurnNotification(isMyTurn: boolean) {
  const [enabled, setEnabled, loaded] = useLocalStorage<boolean>(
    "czulko_turnNotifications",
    false
  );
  const prevIsMyTurn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!enabled) {
      prevIsMyTurn.current = isMyTurn;
      return;
    }

    const wasMyTurn = prevIsMyTurn.current;
    prevIsMyTurn.current = isMyTurn;

    // Tylko przejście false → true; null = pierwsze renderowanie (pominąć)
    if (wasMyTurn === null || wasMyTurn === true || !isMyTurn) return;

    if (document.visibilityState === "visible") {
      toast("🎯 Twoja tura!", {
        description: "Zadaj pytanie lub zgadnij swoją postać.",
        duration: 5000,
      });
    } else if (Notification.permission === "granted") {
      new Notification("Czółko 🎭 — Twoja tura!", {
        body: "Zadaj pytanie lub zgadnij swoją postać.",
        icon: "/favicon.ico",
      });
    }
  }, [isMyTurn, enabled, loaded]);

  async function toggleNotifications() {
    if (!enabled) {
      if (typeof Notification === "undefined") {
        toast.error("Twoja przeglądarka nie wspiera powiadomień.");
        return;
      }
      if (Notification.permission === "denied") {
        toast.error("Powiadomienia są zablokowane — odblokuj je w ustawieniach przeglądarki.");
        return;
      }
      if (Notification.permission !== "granted") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          toast.error("Brak zgody na powiadomienia — funkcja wyłączona.");
          return;
        }
      }
      setEnabled(true);
      toast.success("Powiadomienia włączone 🔔");
    } else {
      setEnabled(false);
      toast("Powiadomienia wyłączone 🔕");
    }
  }

  return { enabled, loaded, toggleNotifications };
}
