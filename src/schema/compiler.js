
import { pushQuery, pushAdditional } from './helpers';

import { assign } from 'lodash'

// The "SchemaCompiler" takes all of the query statements which have been
// gathered in the "SchemaBuilder" and turns them into an array of
// properly formatted / bound query strings.
function SchemaCompiler(client, builder) {
  this.builder = builder
  this.client = client
  this.schema = builder._schema;
  this.formatter = client.formatter()
  this.sequence = []
}

assign(SchemaCompiler.prototype, {

  pushQuery: pushQuery,

  pushAdditional: pushAdditional,

  createTable: buildTable('create'),

  createTableIfNotExists: buildTable('createIfNot'),

  alterTable: buildTable('alter'),

  dropTablePrefix: 'drop table ',

  dropTable(tableName) {
    this.pushQuery(
      this.dropTablePrefix + this.formatter.wrap(prefixedTableName(this.schema, tableName))
    );
  },

  dropTableIfExists(tableName) {
    this.pushQuery(
      this.dropTablePrefix + 'if exists ' +
      this.formatter.wrap(prefixedTableName(this.schema, tableName))
    );
  },

  raw(sql, bindings) {
    this.sequence.push(this.client.raw(sql, bindings).toSQL());
  },

  toSQL() {
    const sequence = this.builder._sequence;
    for (let i = 0, l = sequence.length; i < l; i++) {
      const query = sequence[i];
      this[query.method].apply(this, query.args);
    }
    return this.sequence;
  }

})

function buildTable(type) {
  return function(tableName, fn) {
    const builder = this.client.tableBuilder(type, tableName, fn);

    builder.setSchema(this.schema);
    const sql = builder.toSQL();

    for (let i = 0, l = sql.length; i < l; i++) {
      this.sequence.push(sql[i]);
    }
    if (builder._mustExistColumns.length) {
      this.builder.mustExistColumnsInfo = {
        table: builder._tableName,
        columns: builder._mustExistColumns,
      };
    }
  };
}

function prefixedTableName(prefix, table) {
  return prefix ? `${prefix}.${table}` : table;
}

export default SchemaCompiler;
