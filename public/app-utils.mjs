export const getSexColumnDefinitions = () => [
  { code: 'M', label: 'Masculino', className: 'male-lane' },
  { code: 'F', label: 'Feminino', className: 'female-lane' },
  { code: '', label: 'Sem sexo', className: 'unspecified-lane' },
];

export const getRelevanceColumnDefinitions = () => [
  { code: 'pulse', label: 'Mais pulsos', className: 'pulse-lane' },
  { code: 'echoes', label: 'Mais ecos', className: 'echoes-lane' },
  { code: 'silences', label: 'Mais silenciados', className: 'silences-lane' },
];

export const getUserColumnDefinitions = () => [
  { code: 'oldest', label: 'Usuários mais antigos', className: 'oldest-users-lane' },
  { code: 'newest', label: 'Usuários mais novos', className: 'newest-users-lane' },
  { code: 'active', label: 'Usuários mais ativos', className: 'active-users-lane' },
];

export const hasUnreadMessages = unreadCount => Number(unreadCount || 0) > 0;

export const formatDateTime = (value, locale) => new Date(value).toLocaleString(locale || undefined);
