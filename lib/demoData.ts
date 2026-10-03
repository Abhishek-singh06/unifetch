export interface DemoPackageRequest {
  id: string;
  requester_id: string;
  package_description: string;
  pickup_location: string;
  delivery_location: string;
  pickup_time: string;
  status: "pending" | "claimed" | "delivered" | "cancelled";
  carrier_id?: string | null;
  otp?: string;
  otp_verified?: boolean;
  delivered_at?: string | null;
  created_at: string;
  requester_name?: string;
  carrier_name?: string;
}

export interface DemoOutsideRequest {
  id: string;
  requester_id: string;
  carrier_id: string | null;
  request_type: string;
  destination: string;
  description: string;
  preferred_date: string;
  instructions: string;
  suggested_reward: number;
  final_reward: number | null;
  status: string;
  payment_status: string;
  payment_qr_url: string | null;
  contact_shared: boolean;
  requester_contact: string | null;
  carrier_contact: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export interface DemoOutsideTrip {
  id: string;
  creator_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string | null;
  return_date: string | null;
  return_time: string | null;
  help_types: string[];
  note: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export interface DemoMessage {
  id: string;
  request_id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  proposal_amount: number | null;
  proposal_status: string | null;
  created_at: string;
}

export interface DemoNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export const DEMO_USER = {
  id: "demo-user-trial",
  full_name: "Alex Kumar (Demo Student)",
  college: "Delhi Technological University",
  email: "alex.demo@dtu.ac.in",
  role: "student",
  credits: 100,
  verification_status: "id_submitted",
};

export const INITIAL_DEMO_PACKAGES: DemoPackageRequest[] = [
  {
    id: "demo-pkg-1",
    requester_id: "demo-user-trial",
    package_description: "📦 Amazon Delivery (boAt Rockerz & Type-C Cable)",
    pickup_location: "Main Gate Security Post #2",
    delivery_location: "Hostel 4 • Room 302",
    pickup_time: new Date(Date.now() + 3600000 * 2).toISOString(),
    status: "pending",
    carrier_id: null,
    otp: "482910",
    otp_verified: false,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    requester_name: "Alex Kumar (Demo)",
  },
  {
    id: "demo-pkg-2",
    requester_id: "demo-user-other-1",
    package_description: "📚 3 Engineering Textbooks from Central Library",
    pickup_location: "Central Library Circulation Counter",
    delivery_location: "Hostel 7 • Common Hall",
    pickup_time: new Date(Date.now() + 3600000 * 4).toISOString(),
    status: "claimed",
    carrier_id: "demo-user-trial",
    otp: "719342",
    otp_verified: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    requester_name: "Pooja Roy (EE '25)",
    carrier_name: "Alex Kumar (Demo)",
  },
  {
    id: "demo-pkg-3",
    requester_id: "demo-user-other-2",
    package_description: "🍕 Domino's Meal Box (2 Personal Pizzas)",
    pickup_location: "Turnstile Gate #1",
    delivery_location: "Hostel 2 • Room 114",
    pickup_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "delivered",
    carrier_id: "demo-user-trial",
    otp: "559102",
    otp_verified: true,
    delivered_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    requester_name: "Rohan V.",
    carrier_name: "Alex Kumar (Demo)",
  },
];

export const INITIAL_DEMO_OUTSIDE_REQUESTS: DemoOutsideRequest[] = [
  {
    id: "demo-out-1",
    requester_id: "demo-user-other-3",
    carrier_id: null,
    request_type: "buy",
    destination: "Apollo Pharmacy, City Centre Mall",
    description: "Cold medicine (Cheston Cold) and Volini spray from medical store.",
    preferred_date: new Date(Date.now() + 86400000).toISOString(),
    instructions: "Please collect invoice bill with medicines.",
    suggested_reward: 80,
    final_reward: null,
    status: "OPEN",
    payment_status: "UNPAID",
    payment_qr_url: null,
    contact_shared: false,
    requester_contact: null,
    carrier_contact: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    profiles: { full_name: "Aditya Nair (CS '26)" },
  },
  {
    id: "demo-out-2",
    requester_id: "demo-user-trial",
    carrier_id: "demo-carrier-sneha",
    request_type: "pickup",
    destination: "Botanical Garden Metro Station Gate 2",
    description: "MacBook 65W charging adapter left at cousin's shop near gate 2.",
    preferred_date: new Date(Date.now() + 86400000).toISOString(),
    instructions: "Call cousin when outside gate; adapter is sealed in green pouch.",
    suggested_reward: 100,
    final_reward: 120,
    status: "NEGOTIATING",
    payment_status: "UNPAID",
    payment_qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=sneha.dtu@okaxis&pn=Sneha%20Patel&am=120",
    contact_shared: true,
    requester_contact: "+91 98765 43210",
    carrier_contact: "+91 91234 56789",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    profiles: { full_name: "Sneha Patel (ECE '25)" },
  },
  {
    id: "demo-out-3",
    requester_id: "demo-user-other-4",
    carrier_id: "demo-user-trial",
    request_type: "return",
    destination: "Decathlon Sector 18 Store",
    description: "Return gym duffle bag with exchange receipt.",
    preferred_date: new Date(Date.now() - 86400000).toISOString(),
    instructions: "Show barcode at exchange counter.",
    suggested_reward: 90,
    final_reward: 90,
    status: "PAID",
    payment_status: "PAID_CONFIRMED",
    payment_qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=alex.demo@okicici&pn=Alex%20Kumar&am=90",
    contact_shared: true,
    requester_contact: "+91 98989 89898",
    carrier_contact: "+91 98765 43210",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    profiles: { full_name: "Karan Johar (Mech '24)" },
  },
];

export const INITIAL_DEMO_OUTSIDE_TRIPS: DemoOutsideTrip[] = [
  {
    id: "demo-trip-1",
    creator_id: "demo-user-aman",
    origin: "College Campus",
    destination: "City Centre Mall & Metro Station",
    departure_date: new Date().toISOString().split("T")[0],
    departure_time: "17:30",
    return_date: new Date().toISOString().split("T")[0],
    return_time: "20:30",
    help_types: ["buy", "bring", "pickup"],
    note: "Going via scooter, can bring books, food packs or electronics back to campus.",
    status: "active",
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    profiles: { full_name: "Aman Verma (CS '25)" },
  },
  {
    id: "demo-trip-2",
    creator_id: "demo-user-priya",
    origin: "College Campus",
    destination: "New Delhi Railway Station",
    departure_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    departure_time: "10:00",
    return_date: null,
    return_time: null,
    help_types: ["drop", "pickup"],
    note: "Driving to station to pick up family. Car trunk has plenty of space for luggage or parcels.",
    status: "active",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    profiles: { full_name: "Priya Sharma (BioTech '26)" },
  },
];

export const INITIAL_DEMO_MESSAGES: Record<string, DemoMessage[]> = {
  "demo-out-2": [
    {
      id: "msg-1",
      request_id: "demo-out-2",
      sender_id: "demo-carrier-sneha",
      content: "Hey Alex! I have an evening class near Botanical Garden metro today. I can pick up your MacBook charger around 4:30 PM.",
      is_system: false,
      proposal_amount: null,
      proposal_status: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "msg-2",
      request_id: "demo-out-2",
      sender_id: null,
      content: "Sneha Patel claimed this request and joined the chat.",
      is_system: true,
      proposal_amount: null,
      proposal_status: null,
      created_at: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
    },
    {
      id: "msg-3",
      request_id: "demo-out-2",
      sender_id: "demo-carrier-sneha",
      content: "Since it requires waiting at gate 2 for your cousin, would ₹120 reward work for you?",
      is_system: false,
      proposal_amount: 120,
      proposal_status: "accepted",
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      id: "msg-4",
      request_id: "demo-out-2",
      sender_id: "demo-user-trial",
      content: "Yes, ₹120 sounds very fair. Thanks Sneha! I accepted your proposal. Please let me know once you have it.",
      is_system: false,
      proposal_amount: null,
      proposal_status: null,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
};

export const INITIAL_DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "demo-notif-1",
    user_id: "demo-user-trial",
    type: "PROPOSAL_ACCEPTED",
    title: "Reward Agreed",
    message: "Sneha Patel accepted your negotiation reward of ₹120 for the Laptop Charger task.",
    link: "/outside/demo-out-2",
    read: false,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "demo-notif-2",
    user_id: "demo-user-trial",
    type: "PAYMENT_CONFIRMED",
    title: "UPI Payment Received",
    message: "Karan Johar verified your ₹90 UPI payment for the Decathlon return task.",
    link: "/outside/payments",
    read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-notif-3",
    user_id: "demo-user-trial",
    type: "TASK_ASSIGNED",
    title: "Campus Package Claimed",
    message: "You claimed delivery of 3 Textbooks for Pooja Roy. OTP required on delivery.",
    link: "/carry",
    read: true,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

export interface DemoBroadcast {
  id: string;
  creator_id: string;
  message: string;
  destination: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  category: "going_out" | "need_help" | "general";
  status: "active" | "cancelled";
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export const INITIAL_DEMO_BROADCASTS: DemoBroadcast[] = [
  {
    id: "demo-bc-1",
    creator_id: "demo-carrier-sneha",
    message: "Heading to Phoenix Mall at 5 PM if anyone needs anything picked up from H&M or Croma!",
    destination: "Phoenix Marketcity",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "17:00",
    category: "going_out",
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    profiles: { full_name: "Sneha Patel" },
  },
  {
    id: "demo-bc-2",
    creator_id: "demo-user-trial",
    message: "Can someone coming from South Campus pick up a printed assignment bound from Master Copy Center?",
    destination: "Master Copy Center",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "15:30",
    category: "need_help",
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    profiles: { full_name: "Alex Demo (You)" },
  },
  {
    id: "demo-bc-3",
    creator_id: "demo-carrier-rohit",
    message: "Campus shuttle is currently delayed near Main Gate by 20 mins due to rain.",
    destination: "Main Gate",
    scheduled_date: null,
    scheduled_time: null,
    category: "general",
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    profiles: { full_name: "Rohit Verma" },
  },
];
