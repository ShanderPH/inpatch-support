export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'inPatch Suporte',
  description:
    'Acompanhe o desenvolvimento dos principais projetos e automações do time de Suporte da inChurch',
  navItems: [
    {
      label: 'Projetos',
      href: '/',
    },
    {
      label: 'Tickets',
      href: '/tickets',
    },
  ],
  navMenuItems: [
    {
      label: 'Projetos',
      href: '/',
    },
    {
      label: 'Tickets',
      href: '/tickets',
    },
  ],
  links: {
    github: 'https://github.com/inChurch',
    docs: 'https://docs.inchurch.com.br',
  },
};
