export const formatMGA = (amount: number): string => {
  try {
    // Use Intl when available
    if (typeof Intl !== 'undefined' && (Intl as any).NumberFormat) {
      try {
        return new Intl.NumberFormat('fr-MG', {
          style: 'currency',
          currency: 'MGA',
          maximumFractionDigits: 0,
        }).format(amount);
      } catch (e) {
        // fallback to manual formatting below
      }
    }

    // Fallback: format with spaces as thousand separators and append " Ar"
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(Math.round(amount));
    const parts = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${parts} MGA`;
  } catch (err) {
    return `${amount} MGA`;
  }
}

export default formatMGA;
