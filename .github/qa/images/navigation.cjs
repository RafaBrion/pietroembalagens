function sameDocument (from, to) {
  const first = new URL(from), second = new URL(to)
  return first.origin === second.origin && first.pathname === second.pathname && first.search === second.search
}
module.exports = { sameDocument }
