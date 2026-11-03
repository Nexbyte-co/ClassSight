// Academic term label: July–December is the odd semester "2627ODDSEM" (this year, next year);
// January–June is the even semester "2526EVENSEM" (last year, this year).
export function termLabel(date = new Date()) {
  const year = date.getFullYear();
  const two = (y) => String(y % 100).padStart(2, "0");
  return date.getMonth() >= 6 ? `${two(year)}${two(year + 1)}ODDSEM` : `${two(year - 1)}${two(year)}EVENSEM`;
}
