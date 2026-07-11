export const getSexColumnDefinitions = () => [
  { code: 'M', label: 'Machos', className: 'male-lane' },
  { code: 'F', label: 'Fêmeas', className: 'female-lane' },
  { code: '', label: 'Sem sexo', className: 'unspecified-lane' },
];

export const hasUnreadMessages = unreadCount => Number(unreadCount || 0) > 0;

export const formatDateTime = (value, locale) => new Date(value).toLocaleString(locale || undefined);
