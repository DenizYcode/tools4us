// Site-wide settings the forms and analytics need, in one place. `npm run check:data` reports every value that is
// still "TO FILL" and fails when a service address is malformed. Nothing here is a secret: the Web3Forms access key
// sits in the page by design (SPEC "Contact form": turn on its spam protection and watch the monthly limit).

export const TO_FILL = 'TO FILL';

export const SITE_CONFIG = {
  // Request form (SPEC "Request presales help"). The key is the one the old SelectorTool used for its feedback widget.
  web3forms: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: 'bfdd10fd-62e4-4840-9710-63e8fa3947fb',
  },
  // Cookieless analytics (SPEC "Analytics"). The script is hosted on this site; it only posts to this address.
  goatcounter: {
    endpoint: 'https://denizy.goatcounter.com/count',
  },
  // The data controller named in the KVKK notice (Aydınlatma Metni). The owner fills these in; nothing is invented.
  controller: {
    name: TO_FILL,
    email: TO_FILL,
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** [{ level: 'error' | 'warning', code, message }] for the config above. */
export function siteConfigProblems(config = SITE_CONFIG) {
  const out = [];
  const { web3forms, goatcounter, controller } = config;
  if (web3forms.endpoint !== 'https://api.web3forms.com/submit') out.push({ level: 'error', code: 'SITE_FORM_ENDPOINT', message: `Web3Forms endpoint must be https://api.web3forms.com/submit, not ${web3forms.endpoint}` });
  if (!UUID.test(web3forms.accessKey)) out.push({ level: 'error', code: 'SITE_FORM_KEY', message: 'Web3Forms access key is not a UUID' });
  if (!/^https:\/\/[a-z0-9-]+\.goatcounter\.com\/count$/.test(goatcounter.endpoint)) out.push({ level: 'error', code: 'SITE_ANALYTICS_ENDPOINT', message: `GoatCounter endpoint must be https://<code>.goatcounter.com/count, not ${goatcounter.endpoint}` });
  for (const [field, value] of Object.entries(controller)) {
    if (!value || value === TO_FILL) out.push({ level: 'warning', code: 'SITE_TO_FILL', message: `src/lib/site-config.mjs: controller.${field} is still "${TO_FILL}" (shown in the KVKK notice)` });
  }
  if (controller.email !== TO_FILL && controller.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(controller.email)) out.push({ level: 'error', code: 'SITE_CONTROLLER_EMAIL', message: 'controller.email is not an email address' });
  return out;
}
