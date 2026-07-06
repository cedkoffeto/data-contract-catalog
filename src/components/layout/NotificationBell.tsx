"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useT } from "@/src/lib/use-i18n";

type NotificationItem = {
  id: number;
  contractSlug: string;
  type: string;
  title: string;
  message: string;
  metadata: string;
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
  const { t, tWith } = useT();
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
  const subsLoadedRef = useRef(false);

  const subscribedSlugs = new Set(subscriptions.map((s) => s.contractSlug));

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as { notifications: NotificationItem[] };
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) {
        const data = (await res.json()) as { subscriptions: SubscriptionItem[] };
        setSubscriptions(data.subscriptions);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchSubscriptions();
    const interval = setInterval(fetchNotifications, 30_000);

    function onSubscriptionChange(e: Event) {
      const { slug, subscribed } = (e as CustomEvent).detail;
      setSubscriptions((prev) => {
        if (subscribed) {
          if (prev.some((s) => s.contractSlug === slug)) return prev;
          return [...prev, { userId: "", contractSlug: slug, channel: "in_app", createdAt: new Date().toISOString() }];
        }
        return prev.filter((s) => s.contractSlug !== slug);
      });
    }
    window.addEventListener("subscription-changed", onSubscriptionChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("subscription-changed", onSubscriptionChange);
    };
  }, [fetchNotifications, fetchSubscriptions]);

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
      setIsOpen(true);
      setShowSubscriptions(false);
      subsLoadedRef.current = false;
    } else {
      setIsOpen(false);
    }
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
    setShowSubscriptions(true);
    if (subsLoadedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contracts");
      if (res.ok) {
        const data = (await res.json()) as { items: ContractItem[] };
        setContracts(data.items);
        subsLoadedRef.current = true;
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
        window.dispatchEvent(new CustomEvent("subscription-changed", { detail: { slug, subscribed: !currentlySubscribed } }));
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

  function parseMetadata(metadata: string) {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    const metadata = parseMetadata(n.metadata);
    const contractSlug = typeof metadata.contractSlug === "string" && metadata.contractSlug ? metadata.contractSlug : n.contractSlug;
    const commentId = typeof metadata.commentId === "number" ? metadata.commentId : null;

    if (typeof metadata.path === "string" && metadata.path.startsWith("/")) {
      window.location.href = metadata.path;
    } else if (n.type === "mention" && contractSlug && commentId) {
      window.location.href = `/${contractSlug}#comment-${commentId}`;
    } else if (n.type === "change_request_created") {
      const changeRequestId = typeof metadata.changeRequestId === "number" ? metadata.changeRequestId : "";
      window.location.href = `/admin?tab=changes${changeRequestId ? `&highlight=${changeRequestId}` : ""}`;
    } else if (n.type === "change_request_merged" || n.type === "change_request_approved" || n.type === "change_request_rejected") {
      const changeRequestId = typeof metadata.changeRequestId === "number" ? metadata.changeRequestId : "";
      window.location.href = `/admin?tab=changes${changeRequestId ? `&highlight=${changeRequestId}` : ""}`;
    } else if (n.type === "comment_reply" && contractSlug && commentId) {
      window.location.href = `/${contractSlug}#comment-${commentId}`;
    } else if (n.type === "policy_updated") {
      window.location.href = "/admin?tab=policies";
    } else if (contractSlug) {
      window.location.href = `/${contractSlug}`;
    }
  }

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <button
        ref={buttonRef}
        className={`notification-bell${isOpen ? " is-open" : ""}`}
        onClick={handleToggle}
        type="button"
        aria-label={unreadCount > 0 ? tWith("notificationsUnread", { unread: String(unreadCount) }) : t("notifications")}
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
                  {t("backToNotifications")}
                </button>
                <h3 className="notification-dropdown__title">{t("mySubscriptions")}</h3>
              </div>

              <div className="notification-dropdown__body">
                {loading ? (
                  <p className="notification-dropdown__empty">{t("loading")}</p>
                ) : contracts.length === 0 ? (
                  <p className="notification-dropdown__empty">{t("noAccessibleContracts")}</p>
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
                          <span className="notification-dropdown__item-sub">{c.maturity} &middot; {c.domain || t("noDomain")}</span>
                        </Link>
                        <button
                          className={`notification-dropdown__toggle${isSubscribed ? " is-on" : ""}`}
                          disabled={isSaving}
                          onClick={() => handleToggleSubscription(c.slug, isSubscribed)}
                          type="button"
                          aria-label={isSubscribed ? tWith("unsubscribeFrom", { slug: c.slug }) : tWith("subscribeTo", { slug: c.slug })}
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
                <h3 className="notification-dropdown__title">{t("notifications")}</h3>
                {unreadCount > 0 ? (
                  <button className="notification-dropdown__mark-read" onClick={handleMarkAllRead} type="button">
                    {t("markAllAsRead")}
                  </button>
                ) : null}
              </div>

              <div className="notification-dropdown__body">
                {loading ? (
                  <p className="notification-dropdown__empty">{t("loading")}</p>
                ) : notifications.length === 0 ? (
                  <p className="notification-dropdown__empty">{t("noNotifications")}</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-dropdown__item${n.isRead ? "" : " is-unread"}`}
                    >
                      <button
                        className="notification-dropdown__item-body"
                        onClick={() => void handleNotificationClick(n)}
                        type="button"
                      >
                        <div className="notification-dropdown__item-header">
                          <span className="notification-dropdown__item-title"><span className="notification-dropdown__item-indicator" />{n.title}</span>
                          <span className="notification-dropdown__item-time">{formatDate(n.createdAt)}</span>
                        </div>
                        {n.message ? <p className="notification-dropdown__item-msg">{n.message}</p> : null}
                      </button>
                      <button
                        className="notification-dropdown__toggle-read"
                        onClick={(e) => { e.stopPropagation(); void handleToggleRead(n.id, n.isRead); }}
                        type="button"
                        aria-label={n.isRead ? "Mark as unread" : "Mark as read"}
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true">
                          {n.isRead ? (
                            <path d="M7.5 1a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6.5 4a.5.5 0 01.5.5V7h2a.5.5 0 010 1H6.5a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5z" />
                          ) : (
                            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.5L11 10.3l.5-.87L8.25 8V4h-1z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="notification-dropdown__footer">
                <button className="notification-dropdown__footer-btn" onClick={handleOpenSubscriptions} type="button">
                  {tWith("subscriptionsCount", { count: String(subscriptions.length) })}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
