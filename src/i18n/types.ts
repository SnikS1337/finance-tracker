/**
 * Shape of a single locale's strings. Adding a new language later means
 * creating another file that implements this interface (e.g. `en.ts`) and
 * swapping the export in `index.ts` — no component changes required.
 */
export interface Dictionary {
  app: {
    loadingSection: string;
    chunkErrorTitle: string;
    chunkErrorOffline: string;
    chunkErrorGeneric: string;
    chartUnavailable: string;
    retry: string;
  };
  nav: {
    dashboard: string;
    transactions: string;
    analytics: string;
    settings: string;
    addTransaction: string;
    appName: string;
  };
  common: {
    cancel: string;
    save: string;
    delete: string;
    remove: string;
    edit: string;
    close: string;
    confirm: string;
    add: string;
    today: string;
    yesterday: string;
    all: string;
    unknownCategory: string;
    invalidRange: string;
  };
  period: {
    today: string;
    yesterday: string;
    last7Days: string;
    thisWeek: string;
    lastWeek: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
    custom: string;
    from: string;
    to: string;
    invalidRange: string;
    /** Accessible name of the period preset group. */
    groupLabel: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    /** Which period the dashboard summarises (it is fixed to the current month). */
    periodCaption: string;
    todaySpent: (amount: string) => string;
    todayNothingSpent: string;
    budgetsTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    addTransactionCta: string;
  };
  summary: {
    income: string;
    expenses: string;
    balance: string;
  };
  quickStats: {
    averagePerDay: string;
    medianPerDay: string;
    transactions: string;
    spendingDays: string;
  };
  chart: {
    spendingOverTime: string;
    notEnoughData: string;
    notEnoughDataHint: string;
  };
  categoryBreakdown: {
    spendingByCategory: string;
    incomeByCategory: string;
    expenseEmptyHint: string;
    incomeEmptyHint: string;
  };
  transactionsPage: {
    title: string;
    searchPlaceholder: string;
    allTypes: string;
    expensesOnly: string;
    incomeOnly: string;
    allCategories: string;
    sortNewest: string;
    sortOldest: string;
    sortLargest: string;
    sortSmallest: string;
    emptyTitleNoData: string;
    emptyDescriptionNoData: string;
    emptyTitleNoMatch: string;
    emptyDescriptionNoMatch: string;
    deleteAction: string;
    recurringBadge: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
  };
  transactionForm: {
    addExpenseTitle: string;
    addIncomeTitle: string;
    editTitle: string;
    expense: string;
    income: string;
    amountLabel: string;
    categoryLabel: string;
    dateLabel: string;
    saveChanges: string;
    addExpenseCta: string;
    addIncomeCta: string;
    deleteCta: string;
    errorAmount: string;
    errorCategory: string;
    errorDate: string;
    /** Button in the edit sheet: add the same operation again, dated today. */
    repeatToday: string;
    noteLabel: string;
    notePlaceholder: string;
    repeatMonthly: string;
    repeatMonthlyHint: (day: number) => string;
    recurringEditHint: string;
  };
  toasts: {
    repeatedToday: string;
    /** Appended to the "added/updated" toast when a budget crosses 80% / 100%. */
    budgetUsage: (label: string, percent: number) => string;
    categoryBudgetLabel: (categoryName: string) => string;
    transactionUpdated: string;
    expenseAdded: string;
    incomeAdded: string;
    transactionDeleted: string;
    undo: string;
    categoryUpdated: string;
    categoryCreated: string;
    categoryDeleted: string;
    transactionsMovedAndCategoryDeleted: string;
    budgetSaved: string;
    budgetRemoved: string;
    backupExported: string;
    backupImported: string;
    csvExported: string;
    allDataDeleted: string;
    recurringCreated: string;
    recurringAdded: (count: number) => string;
    recurringStopped: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDescription: string;
    highestSpendingDay: string;
    lowestSpendingDay: string;
    comparedToPrevious: string;
    current: string;
    previous: string;
    difference: string;
  };
  budgets: {
    monthlyBudget: string;
    categoryBudgetTitle: (name: string) => string;
    setMonthlyBudget: string;
    addCategoryBudget: string;
    spentOf: string;
    spent: string;
    of: string;
    amountLabel: string;
    saveBudget: string;
    removeCta: string;
  };
  categories: {
    expenseCategories: string;
    incomeCategories: string;
    addCta: string;
    archived: string;
    edit: string;
    archive: string;
    unarchive: string;
    delete: string;
    newCategoryTitle: string;
    editCategoryTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    iconLabel: string;
    colorLabel: string;
    createCta: string;
    saveCta: string;
    deleteConfirmTitle: (name: string) => string;
    deleteConfirmDescription: string;
    reassignTitle: string;
    reassignDescription: (count: number, name: string) => string;
    reassignNoTarget: (type: string) => string;
    reassignCta: string;
    optionsFor: (name: string) => string;
    typeExpense: string;
    typeIncome: string;
  };
  settings: {
    title: string;
    appearance: string;
    theme: { light: string; dark: string; system: string };
    budgetsSection: string;
    categoriesSection: string;
    reportsSection: string;
    dataSection: string;
    recurringSection: string;
    demoDataNotice: string;
    about: string;
    aboutBody: string;
    version: string;
  };
  recurring: {
    empty: string;
    monthlyOn: (day: number) => string;
    stop: string;
    stopConfirmTitle: string;
    stopConfirmDescription: string;
    stopConfirmCta: string;
  };
  data: {
    exportJson: string;
    importJson: string;
    exportCsv: string;
    deleteAll: string;
    importConfirmTitle: string;
    importConfirmDescription: string;
    importConfirmCta: string;
    deleteAllConfirmTitle: string;
    deleteAllConfirmDescription: string;
    deleteAllConfirmCta: string;
    importGenericError: string;
  };
  report: {
    title: string;
    generate: string;
    darkVersion: string;
    financialSummary: string;
    expenses: string;
    income: string;
    balance: string;
    avgPerDay: string;
    medianPerDay: string;
    topCategories: string;
    footer: string;
    downloadPng: string;
    generating: string;
    generateError: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    exploreDemo: string;
    startFresh: string;
  };
  csv: {
    date: string;
    type: string;
    amount: string;
    category: string;
    expense: string;
    income: string;
    unknown: string;
    note: string;
  };
  errors: {
    storageUnavailable: string;
    storageFull: string;
    saveFailed: string;
    notValidBackup: string;
    newerVersion: string;
    invalidTransactionData: string;
    invalidCategoryData: string;
    invalidBudgetData: string;
    invalidRecurringData: string;
  };
}
