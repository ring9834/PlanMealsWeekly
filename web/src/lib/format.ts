export function formatQuantity(quantity: number): string {
    return Number.isInteger(quantity)
        ? String(quantity)
        : quantity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}
