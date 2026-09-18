/**
 * Compara dos valores serializables por contenido (no por referencia). Se usa en el
 * `fetchAll` de cada store: si lo que llegó del servidor es idéntico a lo que ya había,
 * NO se llama a `set()` con un array/objeto nuevo — así React no re-renderiza pantallas
 * enteras (login, catálogo) en cada tick del polling de 6s cuando en realidad nada cambió.
 * Zustand solo notifica a los suscriptores cuando la referencia devuelta por `set` es
 * distinta, así que devolver el `state` sin tocar es lo que evita el render de más.
 */
export function sameData<T>(a: T, b: T): boolean {
  // Atajo barato: el caso más común en cada poll es que se agregó/cerró un registro (una
  // venta, una caja), lo que ya cambia el largo del array — evita el stringify completo de
  // ambos lados (potencialmente cientos de ítems) para descubrir algo que un .length ya dice.
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
