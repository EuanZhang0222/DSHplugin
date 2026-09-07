/** 库表选择只使用服务端返回的目录；每次切换撤销上一轮请求，避免慢响应串入新来源。 */
export function createDatasetSourceCatalog(loaders) {
  let snapshot = {
    connectionId: '', database: '', table: '', databases: [], tables: [], metadata: null,
    loading: '', error: null,
  };
  const listeners = new Set();
  let revision = 0;
  let request;
  const emit = (patch) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const begin = () => {
    request?.abort();
    request = new AbortController();
    return { revision: ++revision, signal: request.signal };
  };
  const current = (run) => run.revision === revision && !run.signal.aborted;
  const fail = (run, stage, error) => {
    if (current(run)) emit({ loading: '', error: { stage, message: error instanceof Error ? error.message : String(error) } });
  };
  // 不规范化名称大小写或空格，以免改变物理标识符；只去重并丢弃无效条目。
  const names = (rows) => [...new Set((rows || []).filter((value) => typeof value === 'string' && value.length > 0))];

  async function readFields(run) {
    emit({ loading: 'fields', error: null, metadata: null });
    try {
      const metadata = await loaders.inspect({ connectionId: snapshot.connectionId, database: snapshot.database, table: snapshot.table }, run.signal);
      if (!current(run)) return;
      if (!Array.isArray(metadata?.fields) || !metadata.fields.length) throw new Error('没有读取到字段，请检查表是否存在以及账号的元数据读取权限');
      emit({ metadata, loading: '' });
    } catch (error) { fail(run, 'fields', error); }
  }

  async function readTables(run, preferredTable = '') {
    emit({ loading: 'tables', error: null, tables: [], metadata: null });
    try {
      const tables = names(await loaders.tables(snapshot.connectionId, snapshot.database, run.signal));
      if (!current(run)) return;
      const table = tables.includes(preferredTable) ? preferredTable : '';
      emit({ tables, table, loading: '' });
      if (table) await readFields(run);
    } catch (error) { fail(run, 'tables', error); }
  }

  async function selectConnection(connectionId, preferredDatabase = '', preferredTable = '') {
    const run = begin();
    emit({ connectionId, database: preferredDatabase, table: preferredTable, databases: [], tables: [], metadata: null, loading: connectionId ? 'databases' : '', error: null });
    if (!connectionId) return;
    try {
      const databases = names(await loaders.databases(connectionId, run.signal));
      if (!current(run)) return;
      // 优先使用已配置/预选且有权限的库；只有一个可见库时直接展开，多库时由用户选择。
      const database = databases.includes(preferredDatabase) ? preferredDatabase : databases.length === 1 ? databases[0] : '';
      emit({ databases, database, table: database === preferredDatabase ? preferredTable : '', loading: '' });
      if (database) await readTables(run, database === preferredDatabase ? preferredTable : '');
    } catch (error) { fail(run, 'databases', error); }
  }

  async function selectDatabase(database) {
    if (database && !snapshot.databases.includes(database)) return;
    const run = begin();
    emit({ database, table: '', tables: [], metadata: null, loading: '', error: null });
    if (database) await readTables(run);
  }

  async function selectTable(table) {
    if (table && (!snapshot.database || !snapshot.tables.includes(table))) return;
    const run = begin();
    emit({ table, metadata: null, loading: '', error: null });
    if (table) await readFields(run);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    cancel() { revision++; request?.abort(); },
    selectConnection, selectDatabase, selectTable,
    refreshDatabases: () => selectConnection(snapshot.connectionId, snapshot.database, snapshot.table),
    refreshTables() {
      if (!snapshot.database || !snapshot.databases.includes(snapshot.database)) return;
      return readTables(begin(), snapshot.table);
    },
    refreshFields() {
      if (!snapshot.table || !snapshot.tables.includes(snapshot.table)) return;
      return readFields(begin());
    },
  };
}

export function sameDatasetSource(left, right) {
  return ['connectionId', 'database', 'table'].every((key) => (left[key] || '') === (right[key] || ''));
}

/** 数据库定义始终以新读取结果为准，仅保留同表字段上用户维护的业务语义。 */
export function mergeDatasetMetadata(previousFields, metadata) {
  const previous = new Map((previousFields || []).map((field) => [field.name, field]));
  const editable = ['businessName', 'customComment', 'semanticConceptId', 'enabled', 'sensitive'];
  return {
    tableComment: metadata.tableComment || '',
    metadataVersion: metadata.metadataVersion,
    fields: metadata.fields.map((field) => {
      const old = previous.get(field.name);
      const semantics = old ? Object.fromEntries(editable.filter((key) => Object.hasOwn(old, key)).map((key) => [key, old[key]])) : {};
      return { ...field, ...semantics };
    }),
  };
}
