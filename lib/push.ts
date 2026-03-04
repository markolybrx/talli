export async function requestPushPermission() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    const json = subscription.toJSON();
    const keys = json.keys as { p256dh: string; auth: string };
    return { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth };
  } catch (err) {
    console.error("Push subscription failed:", err);
    return null;
  }
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
