window.AltforkPlan = {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('altfork.plan.v1') || '[]');
      return Array.isArray(data)
        ? data.filter((x) => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  },
  save(keys) {
    try {
      localStorage.setItem('altfork.plan.v1', JSON.stringify(keys));
      return true;
    } catch {
      return false;
    }
  },
};
