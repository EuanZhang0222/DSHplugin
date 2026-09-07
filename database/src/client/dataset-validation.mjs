import { sameDatasetSource } from './dataset-source.mjs';

export const DATASET_NAME_MAX_LENGTH = 200;

/** 只检查保存所需信息；业务用途、字段语义和统一概念仍可留空。 */
export function validateDatasetDraft(draft = {}, { editing = false, source = {}, connections } = {}) {
  const issues = new Map();
  const add = (field, message) => issues.set(field, { field, message });
  const name = typeof draft.name === 'string' ? draft.name.trim() : '';
  if (!name) add('name', '请填写数据集名称');
  else if (name.length > DATASET_NAME_MAX_LENGTH) add('name', `数据集名称不能超过 ${DATASET_NAME_MAX_LENGTH} 个字符`);

  const selection = editing ? draft : source;
  if (!selection.connectionId) add('connectionId', '请选择来源连接');
  else if (Array.isArray(connections) && !connections.some((item) => item.id === selection.connectionId)) {
    add('connectionId', '来源连接已不存在，请返回连接管理检查');
  }
  if (!selection.database) add('database', '请选择来源数据库');
  if (!selection.table) add('table', '请选择来源表');

  if (!editing) {
    const targets = { databases: 'database', tables: 'table', fields: 'fields' };
    const loadingMessages = {
      databases: '数据库列表正在加载，请等待完成后选择来源数据库',
      tables: '数据表列表正在加载，请等待完成后选择来源表',
      fields: '字段定义正在读取，请等待完成后再保存',
    };
    const errorMessages = {
      databases: '数据库列表加载失败，请点击“重试加载数据库”后再保存',
      tables: '数据表列表加载失败，请点击“重试加载数据表”后再保存',
      fields: '字段定义读取失败，请点击“重试读取字段”后再保存',
    };
    if (source.loading) {
      add(targets[source.loading] || 'fields', loadingMessages[source.loading] || '数据来源正在读取，请稍后再保存');
      return [...issues.values()];
    }
    if (source.error) {
      add(targets[source.error.stage] || 'fields', errorMessages[source.error.stage] || '数据来源读取失败，请检查并重试');
      return [...issues.values()];
    }
    if (selection.database && !source.databases?.includes(selection.database)) add('database', '来源数据库已失效，请重新选择');
    if (selection.table && !source.tables?.includes(selection.table)) add('table', '来源表已失效，请重新选择');
    if (selection.connectionId && selection.database && selection.table &&
        (!source.metadata?.fields?.length || !sameDatasetSource(draft, source))) {
      add('fields', '尚未取得当前来源表的字段定义，请重新读取字段后再保存');
    }
  }
  if (selection.connectionId && selection.database && selection.table && !draft.fields?.length && !issues.has('fields')) {
    add('fields', '请先成功读取至少一个字段，再保存数据集');
  }
  return [...issues.values()];
}
