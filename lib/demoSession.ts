import {
  DEMO_USER,
  INITIAL_DEMO_PACKAGES,
  INITIAL_DEMO_OUTSIDE_REQUESTS,
  INITIAL_DEMO_OUTSIDE_TRIPS,
  INITIAL_DEMO_MESSAGES,
  INITIAL_DEMO_NOTIFICATIONS,
  INITIAL_DEMO_BROADCASTS,
  DemoPackageRequest,
  DemoOutsideRequest,
  DemoOutsideTrip,
  DemoMessage,
  DemoNotification,
  DemoBroadcast,
} from "./demoData";

const DEMO_ACTIVE_KEY = "unifetch_demo_mode_active";
const DEMO_STORE_KEY = "unifetch_demo_store_v2";

interface DemoStore {
  user: typeof DEMO_USER;
  packages: DemoPackageRequest[];
  outsideRequests: DemoOutsideRequest[];
  trips: DemoOutsideTrip[];
  messages: Record<string, DemoMessage[]>;
  notifications: DemoNotification[];
  broadcasts: DemoBroadcast[];
}

function getInitialStore(): DemoStore {
  return {
    user: { ...DEMO_USER },
    packages: [...INITIAL_DEMO_PACKAGES],
    outsideRequests: [...INITIAL_DEMO_OUTSIDE_REQUESTS],
    trips: [...INITIAL_DEMO_OUTSIDE_TRIPS],
    messages: { ...INITIAL_DEMO_MESSAGES },
    notifications: [...INITIAL_DEMO_NOTIFICATIONS],
    broadcasts: [...INITIAL_DEMO_BROADCASTS],
  };
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_ACTIVE_KEY) === "true";
}

export function enableDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_ACTIVE_KEY, "true");
  if (!localStorage.getItem(DEMO_STORE_KEY)) {
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(getInitialStore()));
  }
}

export function disableDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_ACTIVE_KEY);
  localStorage.removeItem(DEMO_STORE_KEY);
}

function getStore(): DemoStore {
  if (typeof window === "undefined") return getInitialStore();
  const raw = localStorage.getItem(DEMO_STORE_KEY);
  if (!raw) {
    const init = getInitialStore();
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(init));
    return init;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.broadcasts) {
      parsed.broadcasts = [...INITIAL_DEMO_BROADCASTS];
    }
    return parsed;
  } catch {
    const init = getInitialStore();
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(init));
    return init;
  }
}

function saveStore(store: DemoStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
}

// User state
export function getDemoUser() {
  return getStore().user;
}

export function updateDemoUserCredits(amountDelta: number) {
  const store = getStore();
  store.user.credits = Math.max(0, (store.user.credits || 0) + amountDelta);
  saveStore(store);
  return store.user;
}

// Packages (Within College)
export function getDemoPackages(): DemoPackageRequest[] {
  return getStore().packages;
}

export function addDemoPackage(pkg: Omit<DemoPackageRequest, "id" | "created_at" | "requester_id" | "status" | "otp" | "otp_verified">) {
  const store = getStore();
  const newPkg: DemoPackageRequest = {
    ...pkg,
    id: `demo-pkg-${Date.now()}`,
    requester_id: store.user.id,
    requester_name: store.user.full_name,
    status: "pending",
    otp: Math.floor(100000 + Math.random() * 900000).toString(),
    otp_verified: false,
    created_at: new Date().toISOString(),
  };
  store.packages.unshift(newPkg);
  store.user.credits = Math.max(0, store.user.credits - 50);
  saveStore(store);
  return newPkg;
}

export function claimDemoPackage(packageId: string) {
  const store = getStore();
  const pkg = store.packages.find((p) => p.id === packageId);
  if (pkg) {
    pkg.status = "claimed";
    pkg.carrier_id = store.user.id;
    pkg.carrier_name = store.user.full_name;
    saveStore(store);
  }
  return pkg;
}

export function verifyDemoPackageOtp(packageId: string, otp: string): boolean {
  const store = getStore();
  const pkg = store.packages.find((p) => p.id === packageId);
  if (!pkg) return false;
  if (pkg.otp !== otp.trim()) return false;
  
  pkg.status = "delivered";
  pkg.otp_verified = true;
  pkg.delivered_at = new Date().toISOString();
  store.user.credits += 35; // Carrier reward
  saveStore(store);
  return true;
}

// Outside Requests
export function getDemoOutsideRequests(): DemoOutsideRequest[] {
  return getStore().outsideRequests;
}

export function getDemoOutsideRequestById(id: string): DemoOutsideRequest | undefined {
  return getStore().outsideRequests.find((r) => r.id === id);
}

export function addDemoOutsideRequest(req: Partial<DemoOutsideRequest>): DemoOutsideRequest {
  const store = getStore();
  const newReq: DemoOutsideRequest = {
    id: `demo-out-${Date.now()}`,
    requester_id: store.user.id,
    carrier_id: null,
    request_type: req.request_type || "buy",
    destination: req.destination || "City Centre",
    description: req.description || "",
    preferred_date: req.preferred_date || new Date().toISOString(),
    instructions: req.instructions || "",
    suggested_reward: req.suggested_reward || 50,
    final_reward: null,
    status: "OPEN",
    payment_status: "UNPAID",
    payment_qr_url: null,
    contact_shared: false,
    requester_contact: null,
    carrier_contact: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: store.user.full_name },
  };
  store.outsideRequests.unshift(newReq);
  saveStore(store);
  return newReq;
}

export function updateDemoOutsideRequest(id: string, updates: Partial<DemoOutsideRequest>) {
  const store = getStore();
  const index = store.outsideRequests.findIndex((r) => r.id === id);
  if (index !== -1) {
    store.outsideRequests[index] = { ...store.outsideRequests[index], ...updates };
    saveStore(store);
    return store.outsideRequests[index];
  }
  return null;
}

// Outside Trips
export function getDemoTrips(): DemoOutsideTrip[] {
  return getStore().trips;
}

export function addDemoTrip(trip: Partial<DemoOutsideTrip>): DemoOutsideTrip {
  const store = getStore();
  const newTrip: DemoOutsideTrip = {
    id: `demo-trip-${Date.now()}`,
    creator_id: store.user.id,
    origin: trip.origin || "College Campus",
    destination: trip.destination || "",
    departure_date: trip.departure_date || new Date().toISOString().split("T")[0],
    departure_time: trip.departure_time || "18:00",
    return_date: trip.return_date || null,
    return_time: trip.return_time || null,
    help_types: trip.help_types || ["bring"],
    note: trip.note || "",
    status: "active",
    created_at: new Date().toISOString(),
    profiles: { full_name: store.user.full_name },
  };
  store.trips.unshift(newTrip);
  saveStore(store);
  return newTrip;
}

// Messages & Negotiation
export function getDemoMessages(requestId: string): DemoMessage[] {
  const store = getStore();
  return store.messages[requestId] || [];
}

export function sendDemoMessage(requestId: string, content: string, proposalAmount?: number | null): DemoMessage {
  const store = getStore();
  if (!store.messages[requestId]) {
    store.messages[requestId] = [];
  }
  const msg: DemoMessage = {
    id: `msg-${Date.now()}`,
    request_id: requestId,
    sender_id: store.user.id,
    content,
    is_system: false,
    proposal_amount: proposalAmount || null,
    proposal_status: proposalAmount ? "pending" : null,
    created_at: new Date().toISOString(),
  };
  store.messages[requestId].push(msg);
  saveStore(store);
  return msg;
}

// Notifications
export function getDemoNotifications(): DemoNotification[] {
  return getStore().notifications;
}

export function markDemoNotificationRead(id: string) {
  const store = getStore();
  const notif = store.notifications.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
    saveStore(store);
  }
}

// Broadcasts
export function getDemoBroadcasts(): DemoBroadcast[] {
  return getStore().broadcasts.filter((b) => b.status === "active");
}

export function addDemoBroadcast(bc: Partial<DemoBroadcast>): DemoBroadcast {
  const store = getStore();
  const newBc: DemoBroadcast = {
    id: `demo-bc-${Date.now()}`,
    creator_id: store.user.id,
    message: bc.message || "",
    destination: bc.destination || null,
    scheduled_date: bc.scheduled_date || null,
    scheduled_time: bc.scheduled_time || null,
    category: bc.category || "general",
    status: "active",
    created_at: new Date().toISOString(),
    profiles: { full_name: store.user.full_name },
  };
  store.broadcasts.unshift(newBc);
  saveStore(store);
  return newBc;
}

export function cancelDemoBroadcast(id: string): void {
  const store = getStore();
  const bc = store.broadcasts.find((b) => b.id === id);
  if (bc) {
    bc.status = "cancelled";
    saveStore(store);
  }
}
