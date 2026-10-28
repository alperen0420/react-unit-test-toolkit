function displayName(profile) {
  const first = String(profile.firstName ?? '').trim();
  const last = String(profile.lastName ?? '').trim();
  if (!first || !last) throw new Error('First and last name are required');
  return `${first} ${last}`;
}

module.exports = { displayName };
