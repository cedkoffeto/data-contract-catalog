export type Locale = "en" | "fr";

const dictionaries = {
  en: {
    commentsTitle: "Discussion",
    commentsSubtitle: "",
    noComments: "No comments yet. Start the discussion.",
    loadingDiscussion: "Loading discussion...",
    signInToComment: "Sign in to comment.",
    postComment: "Post comment",
    reply: "Reply",
    posting: "Posting...",
    startDiscussionPlaceholder: "Start a discussion... type @ to mention someone",
    replyPlaceholder: "Write a reply... type @ to mention someone",
    replyingTo: "Replying to @{user}",
    cancelReply: "Cancel reply",
    useMentionHint: "Use @username to notify someone.",
    details: "Details",
    issues: "Issues",
    reportIssue: "Report issue",
    reportIssueHint: "Issues are visible to contract admins.",
    addComment: "Comment",
    issuePlaceholder: "Describe the issue...",
  },
  fr: {
    commentsTitle: "Discussion",
    commentsSubtitle: "",
    noComments: "Aucun commentaire. Lancez la discussion.",
    loadingDiscussion: "Chargement de la discussion...",
    signInToComment: "Connectez-vous pour commenter.",
    postComment: "Publier",
    reply: "Répondre",
    posting: "Publication...",
    startDiscussionPlaceholder: "Démarrer une discussion... tapez @ pour mentionner quelqu'un",
    replyPlaceholder: "Répondre... tapez @ pour mentionner quelqu'un",
    replyingTo: "Réponse à @{user}",
    cancelReply: "Annuler",
    useMentionHint: "Utilisez @utilisateur pour notifier quelqu'un.",
    details: "Détails",
    issues: "Signalements",
    reportIssue: "Signaler un problème",
    reportIssueHint: "Les signalements sont visibles par les administrateurs du contrat.",
    addComment: "Commenter",
    issuePlaceholder: "Décrivez le problème...",
  },
} satisfies Record<Locale, Record<string, string>>;

export function getLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("fr")) {
    return "fr";
  }
  return "en";
}

export function t(key: keyof (typeof dictionaries)["en"]) {
  const locale = getLocale();
  return dictionaries[locale][key] ?? dictionaries.en[key];
}

export function tWith(key: keyof (typeof dictionaries)["en"], values: Record<string, string>) {
  return t(key).replace(/\{(\w+)\}/g, (_, token: string) => values[token] ?? "");
}
