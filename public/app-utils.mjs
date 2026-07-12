export const getSexColumnDefinitions = () => [
  { code: 'M', label: 'Machos', className: 'male-lane' },
  { code: 'F', label: 'Fêmeas', className: 'female-lane' },
  { code: '', label: 'Sem sexo', className: 'unspecified-lane' },
];

export const getRelevanceColumnDefinitions = () => [
  { code: 'pulse', label: 'Mais pulsos', className: 'pulse-lane' },
  { code: 'echoes', label: 'Mais ecos', className: 'echoes-lane' },
  { code: 'silences', label: 'Mais silenciados', className: 'silences-lane' },
];

export const hasUnreadMessages = unreadCount => Number(unreadCount || 0) > 0;

export const formatDateTime = (value, locale) => new Date(value).toLocaleString(locale || undefined);
