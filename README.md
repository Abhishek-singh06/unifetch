<div align="center">

# 📦 UniFetch V2
### The Student-Powered Peer Delivery Network — Within & Beyond Campus

Open **https://unifetch.netlify.app/** in your browser!

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

<br />

**Need It? Ask Someone Who's Going.**

UniFetch connects students who need something picked up, carried, or delivered with peers who are already heading that way — whether it's **within college or outside campus**.

For campus deliveries, students earn and spend UniFetch Credits. For Outside Campus tasks, students can negotiate **real INR rewards and pay directly through UPI**.

[🌐 Explore Repository](https://github.com/Abhishek-singh06/unifetch) • [🚀 Quick Start](#-quick-start) • [📐 Architecture](#-how-its-made--tech-stack) • [🛡️ Security](#-security)

---

</div>

## 💡 What is UniFetch?

UniFetch is a **student-powered delivery network** built around something students already do every day: travel from one place to another.

Instead of making a separate trip to collect or deliver something, students can ask someone who is already heading in that direction to help.

UniFetch V2 expands this idea beyond the traditional campus gate model with two distinct delivery systems:

### 🎓 Within College

Students can request packages from campus gates, pickup points, or other supported locations and have another student bring them to their hostel or destination.

The Within-College system uses **UniFetch Credits** for rewards.

### 🌍 Outside Campus

Students can announce trips outside campus and help other students carry items to destinations such as another city or location.

Outside-Campus tasks use **direct INR payments between students**, with rewards negotiated inside the task chat and payments handled through UPI.

---

## 🎯 The Problem

Students frequently make trips that could have helped someone else.

- 📦 A student needs to collect a package from the campus gate.
- 🚶 Another student is already walking toward that gate.
- 🚌 A student is travelling outside campus.
- 📍 Another student needs something carried to that destination.
- 💸 Students want a simple way to agree on a reward and complete the task.

UniFetch turns these everyday trips into opportunities for students to help one another.

---

## ✨ Key Features

### 🎓 Within-College Delivery

- **📦 Package Requests** — Create requests for packages that need to be picked up and delivered.
- **🚴 Student-to-Student Delivery** — Students can claim requests that fit their route.
- **🪙 Credit Rewards** — Carriers earn UniFetch Credits for successful campus deliveries.
- **🔐 OTP Completion** — A private OTP confirms successful package handoff before the task is completed.

### 🌍 Outside-Campus Delivery

- **🚌 Trip Announcements** — Students can announce where and when they are travelling.
- **📍 Trip Matching** — Other students can discover trips heading toward their destination.
- **🤝 Negotiation Chat** — Requesters and carriers can negotiate the reward directly.
- **💰 INR Rewards** — Outside-Campus tasks use real-money rewards rather than UniFetch Credits.
- **📱 UPI Payment Sharing** — Users can share payment details and QR codes directly inside the negotiation chat.
- **💳 Payment Tracking** — Dedicated states track payment from pending to sent, confirmed, and completed.
- **📊 Task Timeline** — Clearly shows the progress of an Outside-Campus task.

### 💳 Credit System

- Students start with a UniFetch Credit balance.
- Credits are used for Within-College delivery rewards.
- Additional credits can be purchased through the admin-configured UPI payment system.
- Credit purchases remain pending until manually verified by an admin.
- Admins can configure the platform's **UPI ID and QR code** from the admin portal.

### ⭐ Reviews & Reputation

After completed tasks, students can leave ratings and optional feedback.

The reputation system helps students make more informed decisions when interacting with other users.

### 📢 Community Broadcasts

Students can post short community announcements such as:

- 🚌 Going somewhere
- 📦 Need help carrying something
- 📢 General campus announcements

Broadcasts provide a lightweight way for students to communicate opportunities that don't necessarily require a formal delivery request.

### 🔔 Notifications

UniFetch includes a notification system for important activity such as:

- New requests
- Claims and acceptances
- Chat activity
- Reward agreements
- Payment updates
- Task completion
- Reviews
- Credit purchases

Notifications are available inside the application, with optional email notifications through Resend when configured.

### 🛡️ Safety & Trust

- User reporting
- User blocking
- Safety guidelines
- Reviews and reputation
- College ID verification
- Secure database authorization
- Protected payment information

---

## 🛠️ How It's Made & Tech Stack

UniFetch is built as a full-stack application using Next.js and Supabase, with database-level security for sensitive operations.

```mermaid
graph TD
    A[Student Browser / Mobile] -->|Next.js 16 App Router| B[Frontend UI]
    B -->|Supabase Auth| C[Authentication]
    B -->|Realtime WebSockets| D[Realtime Notifications]
    B -->|Queries + RLS| E[(Supabase PostgreSQL)]

    E -->|SECURITY DEFINER RPCs| F[Secure Transactions]
    E -->|Database Triggers| G[Notifications]

    B -->|Supabase Storage| H[College IDs & Payment QR]
    B -->|Server API Route| I[Resend Email]
