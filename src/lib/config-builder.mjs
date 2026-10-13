// Configuration builder: which accessories fit a model, how many a model takes, and the SKU string.
// Only exact, verified pairs are offered: `compat` lists accessory PID + model PID (never a series), and the
// published data holds only the pairs that were checked against a datasheet. A model with no pair has no builder.
//
// This is a helper for choosing an uplink module, not a validated bill of materials: power supplies, licences
// and cables are not part of it, and the page says so (SPEC "Out of scope": full configuration validation).

/** How many accessories of a kind one model takes. Uplink network modules: one slot on a modular-uplink switch. */
export function slotLimit(card, kind) {
  if (kind === 'network_module') return card.modular_uplinks ? 1 : 0;
  return 0;
}

/** Accessories whose compat pair names this model PID, in the order of the accessories sheet. */
export function optionsFor(modelPid, accessories, compat) {
  const fits = new Set(compat.filter((c) => c.model_pid === modelPid).map((c) => c.accessory_pid));
  return accessories.filter((a) => fits.has(a.pid) && a.lifecycle === 'current');
}

/** "C9300-48P + C9300-NM-8X": the model PID followed by the chosen accessory PIDs. */
export function buildSku(modelPid, picks) {
  return [modelPid, ...picks].join(' + ');
}

/** Checks a choice: every pick must be an offered option, and no kind may exceed the model's slots. */
export function checkConfig(card, picks, options) {
  const errors = [];
  const byKind = new Map();
  for (const pid of picks) {
    const option = options.find((o) => o.pid === pid);
    if (!option) {
      errors.push({ code: 'NOT_COMPATIBLE', pid });
      continue;
    }
    byKind.set(option.kind, (byKind.get(option.kind) ?? 0) + 1);
  }
  for (const [kind, n] of byKind) if (n > slotLimit(card, kind)) errors.push({ code: 'TOO_MANY', kind, limit: slotLimit(card, kind) });
  return { ok: errors.length === 0, errors };
}

/** "8 x 10G (fiber)" from the accessory's own fields. Returns null when the data does not say. */
export function describe(accessory, lang = 'tr') {
  const speed = accessory.speed_gbps?.[0];
  if (!accessory.port_count || !speed) return null;
  const n = lang === 'tr' ? String(speed).replace('.', ',') : String(speed);
  return `${accessory.port_count} x ${n}G`;
}
