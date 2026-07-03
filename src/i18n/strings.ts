export const strings = {
  appName: "Project Predicte",
  tabs: {
    home: "Home",
    leagues: "Le mie leghe",
    notifications: "Notifiche",
    profile: "Profilo"
  },
  leagueSections: {
    overview: "Panoramica",
    predictions: "Pronostici",
    leaderboard: "Classifica",
    participants: "Partecipanti",
    rules: "Regolamento"
  },
  actions: {
    createLeague: "Crea lega mock",
    joinLeague: "Simula invito",
    open: "Apri",
    lockLeague: "Blocca lega",
    settleResult: "Simula risultato ufficiale",
    nextIncomplete: "Vai al prossimo mancante",
    all: "Tutti",
    incomplete: "Incompleti",
    completed: "Completati"
  },
  status: {
    open: "Aperta",
    locked: "Bloccata",
    live: "Live",
    completed: "Completata",
    archived: "Archiviata",
    draft: "Bozza",
    cancelled: "Annullata",
    synced: "Sincronizzato",
    syncing: "Sincronizzazione",
    local: "Salvato locale",
    syncFailed: "Errore sync"
  },
  copy: {
    mockOnly: "Vertical slice mock: nessuna API sportiva reale collegata.",
    supabaseNotConfigured:
      "Supabase non configurato: il flusso mock resta attivo. Imposta EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY per usare Auth reale.",
    supabaseConfigured: "Supabase configurato: puoi usare login reale con Google o Apple.",
    noLeagues: "Nessuna lega attiva.",
    deadline: "Deadline pronostici",
    predictionProgress: "Avanzamento pronostici",
    leaderboardUpdated: "Classifica aggiornata",
    hiddenUntilLock: "Nascosto fino al blocco",
    visibleAfterLock: "Visibile dopo il blocco",
    currentUser: "Tu",
    latestPoints: "Ultimo update",
    points: "punti",
    rulesLocked: "Regole bloccate e immutabili",
    rulesEditable: "Regole modificabili fino al blocco",
    assumption: "Assunzione Milestone 0"
  }
} as const;
