export function admobImpressionJson(paid) {
  const micros = Number(paid?.valueMicros);
  if (paid?.valueMicros == null || !Number.isFinite(micros) || micros < 0) return null;
  const optional = {
    ad_unit_id: paid.adUnitId,
    currency_code: paid.currencyCode,
    precision_type: paid.precision,
    mediation_adapter_class_name: paid.networkName,
    response_id: paid.impressionId,
  };
  const present = Object.entries(optional).filter(([, v]) => v != null && v !== '');
  return { value_micros: micros, ...Object.fromEntries(present) };
}
