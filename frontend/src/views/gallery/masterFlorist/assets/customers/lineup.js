const DEFAULT_CUSTOMERS = [
  {
    id: 'customer-01',
    name: 'Aurora',
    mood: 'cheerful',
    preference: {
      palette: ['rose', 'tulip'],
      accent: 'fern',
    },
  },
  {
    id: 'customer-02',
    name: 'Theo',
    mood: 'thoughtful',
    preference: {
      palette: ['orchid', 'lavender'],
      accent: 'daisy',
    },
  },
  {
    id: 'customer-03',
    name: 'Mira',
    mood: 'hurried',
    preference: {
      palette: ['daisy', 'rose'],
      accent: 'fern',
    },
  },
];

export function getCustomerLineup() {
  return DEFAULT_CUSTOMERS.map((entry) => ({ ...entry }));
}