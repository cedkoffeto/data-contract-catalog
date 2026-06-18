"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  id: number;
  contractSlug: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type SubscriptionItem = {
  userId: string;
  contractSlug: string;
  channel: string;
  createdAt: string;
};

type ContractItem = {
  slug: string;
  title: string;
  domain: string;
  maturity: string;
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const subscribedSlugs = new Set(subscriptions.map((s) => s.contractSlug));

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: NotificationItem[] };
      setNotifications(data.notifications);
      const unread = data.notifications.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleToggle() {
    if (!isOpen) {
      setLoading(true);
      setShowSubscriptions(false);
      try {
        const [notifRes, subRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/subscriptions"),
        ]);
        if (notifRes.ok) {
          const data = (await notifRes.json()) as { notifications: NotificationItem[] };
          setNotifications(data.notifications);
          const unread = data.notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        }
        if (subRes.ok) {
          const data = (await subRes.json()) as { subscriptions: SubscriptionItem[] };
          setSubscriptions(data.subscriptions);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  }

  async function handleToggleRead(id: number, currentlyRead: boolean) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !currentlyRead } : n)),
    );
    setUnreadCount((prev) => currentlyRead ? prev + 1 : Math.max(0, prev - 1));

    await fetch(currentlyRead ? "/api/notifications/unread" : "/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true })),
    );
    setUnreadCount(0);

    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
  }

  async function handleOpenSubscriptions() {
    setLoading(true);
    setShowSubscriptions(true);
    try {
      const [subRes, contractsRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/contracts"),
      ]);
      if (subRes.ok) {
        const data = (await subRes.json()) as { subscriptions: SubscriptionItem[] };
        setSubscriptions(data.subscriptions);
      }
      if (contractsRes.ok) {
        const data = (await contractsRes.json()) as { items: ContractItem[] };
        setContracts(data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSubscription(slug: string, currentlySubscribed: boolean) {
    setSavingSlug(slug);

    try {
      const res = await fetch(`/api/contracts/${slug}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentlySubscribed ? { channel: null } : {}),
      });

      if (res.ok) {
        if (currentlySubscribed) {
          setSubscriptions((prev) => prev.filter((s) => s.contractSlug !== slug));
        } else {
          setSubscriptions((prev) => [
            ...prev,
            { userId: "", contractSlug: slug, channel: "in_app", createdAt: new Date().toISOString() },
          ]);
        }
      }
    } catch {
      // silent
    } finally {
      setSavingSlug(null);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <button
        ref={buttonRef}
        className={`notification-bell${isOpen ? " is-open" : ""}`}
        onClick={handleToggle}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="notification-bell__icon">
          <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notification-bell__badge">{displayCount}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div ref={menuRef} className="notification-dropdown notification-dropdown--with-subs" role="menu">
          {showSubscriptions ? (
            <>
              <div className="notification-dropdown__header">
                <button className="notification-dropdown__mark-read" onClick={() => setShowSubscriptions(false)} type="button">
                  &larr; Notifications
                </button>
                <h3 className="notification-dropdown__title">My subscriptions</h3>
              </div>

              <div className="notification-dropdown__body">
                {loading ? (
                  <p className="notification-dropdown__empty">Loading...</p>
                ) : contracts.length === 0 ? (
                  <p className="notification-dropdown__empty">No accessible contracts</p>
                ) : (
                  contracts.map((c) => {
                    const isSubscribed = subscribedSlugs.has(c.slug);
                    const isSaving = savingSlug === c.slug;
                    return (
                      <div key={c.slug} className="notification-dropdown__item notification-dropdown__item--sub-row">
                        <Link
                          href={`/${c.slug}`}
                          className="notification-dropdown__item-link"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="notification-dropdown__item-title">{c.title || c.slug}</span>
                          <span className="notification-dropdown__item-sub">{c.maturity} &middot; {c.domain || "no domain"}</span>
                        </Link>
                        <button
                          className={`notification-dropdown__toggle${isSubscribed ? " is-on" : ""}`}
                          disabled={isSaving}
                          onClick={() => handleToggleSubscription(c.slug, isSubscribed)}
                          type="button"
                          aria-label={isSubscribed ? `Unsubscribe from ${c.slug}` : `Subscribe to ${c.slug}`}
                        >
                          <span className="notification-dropdown__toggle-track">
                            <span className="notification-dropdown__toggle-thumb" />
                          </span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <div className="notification-dropdown__header">
                <h3 className="notification-dropdown__title">Notifications</h3>
                {unreadCount > 0 ? (
                  <button className="notification-dropdown__mark-read" onClick={handleMarkAllRead} type="button">
                    Mark all as read
                  </button>
                ) : null}
              </div>

              <div className="notification-dropdown__body">
                {loading ? (
                  <p className="notification-dropdown__empty">Loading...</p>
                ) : notifications.length === 0 ? (
                  <p className="notification-dropdown__empty">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`notification-dropdown__item${n.isRead ? "" : " is-unread"}`}
                      onClick={() => handleToggleRead(n.id, n.isRead)}
                      type="button"
                    >
                      <div className="notification-dropdown__item-header">
                        <span className="notification-dropdown__item-title">{n.title}</span>
                        <span className="notification-dropdown__item-time">{formatDate(n.createdAt)}</span>
                      </div>
                      {n.message ? <p className="notification-dropdown__item-msg">{n.message}</p> : null}
                    </button>
                  ))
                )}
              </div>

              <div className="notification-dropdown__footer">
                <button className="notification-dropdown__footer-btn" onClick={handleOpenSubscriptions} type="button">
                  My subscriptions ({subscriptions.length})
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
