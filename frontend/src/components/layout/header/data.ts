/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export const notifications = [
  {
    id: 1,
    title: "First Notification",
    role: "Frontend Developer",
    desc: "Amet minim mollit non deser unt ullamco est sit aliqua.",
    avatar: "01.png",
    status: "online",
    unread_message: false,
    type: "text",
    date: "2 days ago"
  },
];

export type Notification = (typeof notifications)[number];
