export const getSexColumnDefinitions = () => [
  { code: 'M', label: 'Masculino', className: 'male-lane' },
  { code: 'F', label: 'Feminino', className: 'female-lane' },
  { code: '', label: 'Sem sexo', className: 'unspecified-lane' },
];

export const getAgeColumnDefinitions = () => [
  { code: 'to25', label: 'Até 25 anos', className: 'age-to-25-lane' },
  { code: 'to50', label: '26 a 50 anos', className: 'age-to-50-lane' },
  { code: 'to75', label: '51 a 75 anos', className: 'age-to-75-lane' },
  { code: 'over75', label: '75+ anos', className: 'age-over-75-lane' },
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
